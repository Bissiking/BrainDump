import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { AuthService } from "./auth-service.js";

const authorizationLifetime = 10 * 60 * 1000;

function loginError(reply: FastifyReply, code: string) {
  return reply.redirect(`/login?error=${encodeURIComponent(code)}`);
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  auth: AuthService
) {
  app.get("/auth/login", async (request, reply) => {
    if (await auth.refreshSessionIfNeeded(request)) {
      return reply.redirect("/");
    }

    const state = crypto.randomBytes(32).toString("base64url");
    request.session.kyrosAuthorization = {
      state,
      createdAt: Date.now()
    };

    const authorizeUrl = new URL(`${auth.config.baseUrl}/authorize`);
    authorizeUrl.searchParams.set("client_id", auth.config.clientId);
    authorizeUrl.searchParams.set(
      "redirect_uri",
      `${auth.config.appBaseUrl}/auth/callback`
    );
    authorizeUrl.searchParams.set(
      "scope",
      auth.config.requestedScopes
    );
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("state", state);

    return reply.redirect(authorizeUrl.toString());
  });

  app.get<{
    Querystring: {
      code?: string;
      state?: string;
      error?: string;
    };
  }>("/auth/callback", async (request, reply) => {
    const pending = request.session.kyrosAuthorization;
    delete request.session.kyrosAuthorization;

    if (request.query.error) return loginError(reply, "cancelled");
    if (
      !pending ||
      Date.now() - pending.createdAt > authorizationLifetime ||
      !request.query.state ||
      pending.state !== request.query.state
    ) {
      return loginError(reply, "expired");
    }
    if (!request.query.code) return loginError(reply, "missing_code");

    try {
      await auth.exchangeAuthorizationCode(request, request.query.code);
      return reply.redirect("/");
    } catch (error) {
      request.log.warn({ err: error }, "Échec de connexion Kyros");
      return loginError(reply, "provider");
    }
  });

  app.get("/api/session", async (request) => {
    const authenticated = await auth.refreshSessionIfNeeded(request);
    return {
      authenticated,
      user: authenticated ? request.session.user : null,
      authentication: { provider: "kyros", available: true }
    };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    await auth.logout(request);
    reply.clearCookie("braindump.sid", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    return { success: true };
  });
}
