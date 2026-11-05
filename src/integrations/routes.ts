// src/integrations/routes.ts
import type { FastifyInstance, FastifyRequest } from "fastify";
import type Database from "better-sqlite3";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { createIntegrationStore, IntegrationError } from "./store.js";
import { viewsRoot } from "../web/paths.js";
declare module "fastify" {
  interface Session {
    integrationReturn?: string;
    integrationCsrf?: string;
  }
}
const text = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (v) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        v
      ]!,
  );
const secretField = z.string().min(30).max(100);
const authorizationSchema = z
  .object({
    client_id: secretField,
    redirect_uri: z.url().max(1000),
    state: secretField,
    code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    code_challenge_method: z.literal("S256").default("S256"),
  })
  .strict();
export async function registerIntegrationRoutes(
  root: FastifyInstance,
  auth: AuthService,
  database: Database.Database,
  options: { allowLocalRedirects?: boolean } = {},
) {
  const store = createIntegrationStore(database, auth.config.issuer);
  const allowLocalRedirects =
    options.allowLocalRedirects ?? process.env.NODE_ENV !== "production";
  await root.register(async (app) => {
    app.addContentTypeParser(
      "application/x-www-form-urlencoded",
      { parseAs: "string" },
      (_req, body, done) =>
        done(null, Object.fromEntries(new URLSearchParams(body as string))),
    );
    app.addHook("onSend", async (_req, reply, payload) => {
      reply.header("cache-control", "no-store");
      if (!reply.hasHeader("referrer-policy"))
        reply.header("referrer-policy", "no-referrer");
      return payload;
    });
    app.setErrorHandler((error, _request, reply) =>
      reply
        .code(
          error instanceof IntegrationError
            ? error.status
            : error instanceof z.ZodError
              ? 400
              : 500,
        )
        .send({
          error:
            error instanceof IntegrationError
              ? error.message
              : error instanceof z.ZodError
                ? "Paramètres invalides."
                : "Connexion indisponible. Réessayez.",
        }),
    );
    const session = async (req: FastifyRequest) => {
      if (!(await auth.refreshSessionIfNeeded(req)) || !req.session.user)
        throw new IntegrationError(
          401,
          "Reconnectez-vous à BrainDump pour continuer.",
        );
      return req.session.user;
    };
    const origin = (req: FastifyRequest) => {
      if (req.headers.origin !== new URL(auth.config.appBaseUrl).origin)
        throw new IntegrationError(403, "Origine refusée.");
    };
    const application = (req: FastifyRequest) =>
      store.authenticate(
        req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.slice(7)
          : "",
      );
    app.get("/integrations", async (req, reply) => {
      await session(req);
      return reply.sendFile("integrations.html", viewsRoot);
    });
    app.get("/api/integrations/clients", async (req) => ({
      data: store.list((await session(req)).id),
      grants: store.grants(req.session.user!.id),
    }));
    app.post("/api/integrations/clients", async (req, reply) => {
      origin(req);
      const user = await session(req);
      const b = z
        .object({
          name: z.string().trim().min(1).max(80),
          redirect_uri: z.url().max(1000),
        })
        .strict()
        .parse(req.body);
      const u = new URL(b.redirect_uri);
      if (
        u.username ||
        u.password ||
        u.hash ||
        u.search ||
        (u.protocol !== "https:" &&
          !(
            allowLocalRedirects &&
            u.protocol === "http:" &&
            ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname)
          ))
      )
        throw new IntegrationError(
          400,
          "URL HTTPS exacte requise, ou boucle locale en développement.",
        );
      return reply
        .code(201)
        .send(store.register(user.id, b.name, u.toString()));
    });
    app.post<{ Params: { id: string } }>(
      "/api/integrations/clients/:id/rotate",
      async (req) => {
        origin(req);
        return store.rotate(
          (await session(req)).id,
          secretField.parse(req.params.id),
        );
      },
    );
    app.delete<{ Params: { id: string } }>(
      "/api/integrations/clients/:id",
      async (req) => {
        origin(req);
        store.revokeClient(
          (await session(req)).id,
          secretField.parse(req.params.id),
        );
        return { ok: true };
      },
    );
    app.delete<{ Params: { id: string } }>(
      "/api/integrations/grants/:id",
      async (req) => {
        origin(req);
        store.revokeGrant(
          (await session(req)).id,
          secretField.parse(req.params.id),
        );
        return { ok: true };
      },
    );
    app.get("/api/integrations/capabilities", async (req) => {
      const c = application(req);
      return {
        client_id: c.id,
        identity_issuer: auth.config.issuer,
        provider: "braindump",
        scopes: ["notes:dated:read"],
        protocol_version: 1,
      };
    });
    app.get("/integrations/authorize", async (req, reply) => {
      const q = authorizationSchema.parse(req.query),
        c = store.client(q.client_id);
      if (c.redirect_uri !== q.redirect_uri)
        throw new IntegrationError(400, "URL de retour invalide.");
      if (!(await auth.refreshSessionIfNeeded(req)) || !req.session.user) {
        req.session.integrationReturn =
          "/integrations/authorize?" + new URLSearchParams(q).toString();
        return reply.redirect("/auth/login");
      }
      const csrf = (req.session.integrationCsrf =
        randomBytes(32).toString("base64url"));
      return reply
        .header("Referrer-Policy", "same-origin")
        .type("text/html; charset=utf-8")
        .send(
          `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Autoriser ${text(c.name)} · BrainDump</title><link rel="stylesheet" href="/assets/css/app.css"><link rel="stylesheet" href="/assets/css/integrations.css"></head><body class="integration-page"><main id="main" class="integration-main consent-main"><a href="/">Retour à BrainDump</a><h1>Autoriser ${text(c.name)}</h1><p>Compte : <strong>${text(req.session.user.displayName)}</strong></p><p>Cette application pourra lire uniquement vos notes avec une date. Elle ne pourra ni les modifier ni lire vos tâches ou notes sans date.</p><p>Destination : <strong>${text(new URL(c.redirect_uri).origin)}</strong></p><p>Vous pourrez retirer cette autorisation dans Applications connectées.</p><form action="/integrations/authorize" method="post">${Object.entries(
            { ...q, csrf },
          )
            .map(
              ([k, v]) =>
                `<input type="hidden" name="${k}" value="${text(v)}">`,
            )
            .join(
              "",
            )}<div class="integration-actions"><button class="primary-action" name="decision" value="allow">Autoriser la lecture des notes datées</button><button class="text-action" name="decision" value="deny">Refuser</button></div></form></main></body></html>`,
        );
    });
    app.post("/integrations/authorize", async (req, reply) => {
      origin(req);
      const user = await session(req);
      const b = authorizationSchema
          .extend({ csrf: secretField, decision: z.enum(["allow", "deny"]) })
          .parse(req.body),
        c = store.client(b.client_id);
      if (c.redirect_uri !== b.redirect_uri)
        throw new IntegrationError(400, "URL de retour invalide.");
      const expected = req.session.integrationCsrf;
      delete req.session.integrationCsrf;
      if (
        !expected ||
        expected.length !== b.csrf.length ||
        !timingSafeEqual(Buffer.from(expected), Buffer.from(b.csrf))
      )
        throw new IntegrationError(
          403,
          "Confirmation expirée. Relancez la connexion.",
        );
      const u = new URL(c.redirect_uri);
      u.searchParams.set("state", b.state);
      if (b.decision === "deny") u.searchParams.set("error", "access_denied");
      else
        u.searchParams.set(
          "code",
          store.authorize(c, user.id, b.redirect_uri, b.code_challenge),
        );
      return reply.redirect(u.toString());
    });
    app.post("/api/integrations/token", async (req) => {
      const c = application(req);
      const b = z
        .discriminatedUnion("grant_type", [
          z
            .object({
              grant_type: z.literal("authorization_code"),
              code: secretField,
              redirect_uri: z.url().max(1000),
              code_verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
            })
            .strict(),
          z
            .object({
              grant_type: z.literal("refresh_token"),
              refresh_token: secretField,
            })
            .strict(),
        ])
        .parse(req.body);
      return b.grant_type === "authorization_code"
        ? store.exchange(c, b.code, b.redirect_uri, b.code_verifier)
        : store.refresh(c, b.refresh_token);
    });
    app.post("/api/integrations/revoke", async (req) => {
      const c = application(req),
        b = z.object({ refresh_token: secretField }).strict().parse(req.body);
      store.revoke(c, b.refresh_token);
      return { ok: true };
    });
    app.get("/api/integrations/notes", async (req) =>
      store.notes(
        application(req),
        secretField.parse(req.headers["x-braindump-user-token"]),
      ),
    );
  });
}
