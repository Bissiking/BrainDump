// src/server.ts
import "dotenv/config";
import Fastify, {
  type FastifyReply,
  type FastifyRequest
} from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import jwt, { type JwtPayload } from "jsonwebtoken";
import crypto from "node:crypto";
import { resolve } from "node:path";
import { z } from "zod";
import { classifyNote } from "./classifier/classify.js";
import {
  createNote,
  deleteNote,
  listNotes
} from "./database/database.js";

declare module "fastify" {
  interface Session {
    kyrosAuthorization?: {
      state: string;
      createdAt: number;
    };
    user?: {
      id: string;
      username: string;
      displayName: string;
    };
    kyros?: {
      accessToken: string;
      refreshToken: string;
      accessTokenExpiresAt: number;
    };
  }

  interface FastifyRequest {
    currentUser?: {
      id: string;
      username: string;
      displayName: string;
    };
  }
}

interface KyrosClaims extends JwtPayload {
  sub: string;
  username?: string;
  display_name?: string;
  resource_aud?: string;
  client_id?: string;
  scope?: string;
}

interface KyrosTokenResponse {
  access_token: string;
  refresh_token: string;
  refresh_token_expires_at?: number | null;
  user?: {
    id?: string;
    username?: string;
    displayName?: string;
  };
}

const requiredEnvironmentVariables = [
  "SESSION_SECRET",
  "KYROS_BASE_URL",
  "KYROS_CLIENT_ID",
  "KYROS_CLIENT_SECRET",
  "KYROS_JWT_SECRET",
  "KYROS_RESOURCE_AUDIENCE"
] as const;

for (const variableName of requiredEnvironmentVariables) {
  if (!process.env[variableName]) {
    throw new Error(`Variable d'environnement absente : ${variableName}`);
  }
}

const port = Number(process.env.PORT ?? 3005);
const appBaseUrl =
  process.env.APP_BASE_URL ?? `http://localhost:${port}`;

const kyrosBaseUrl = process.env.KYROS_BASE_URL!.replace(/\/$/, "");
const kyrosClientId = process.env.KYROS_CLIENT_ID!;
const kyrosClientSecret = process.env.KYROS_CLIENT_SECRET!;
const kyrosJwtSecret = process.env.KYROS_JWT_SECRET!;
const kyrosIssuer = process.env.KYROS_ISSUER ?? "kyros";
const kyrosAudience = process.env.KYROS_AUDIENCE ?? "kyros-modules";
const kyrosResourceAudience =
  process.env.KYROS_RESOURCE_AUDIENCE!;

const requestedScopes =
  process.env.KYROS_REQUESTED_SCOPES ??
  "profile email braindump:access";

const requiredScopes = (
  process.env.KYROS_REQUIRED_SCOPES ??
  "profile email braindump:access"
)
  .split(/\s+/)
  .filter(Boolean);

const app = Fastify({
  logger: true
});

await app.register(fastifyCookie);

await app.register(fastifySession, {
  secret: process.env.SESSION_SECRET!,
  cookieName: "braindump.sid",
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
});

await app.register(fastifyStatic, {
  root: resolve("public"),
  prefix: "/"
});

const noteSchema = z.object({
  content: z.string().trim().min(2).max(5000)
});

function verifyAccessToken(accessToken: string): KyrosClaims {
  const claims = jwt.verify(accessToken, kyrosJwtSecret, {
    algorithms: ["HS256"],
    issuer: kyrosIssuer,
    audience: kyrosAudience,
    clockTolerance: 5
  }) as KyrosClaims;

  if (!claims.sub) {
    throw new Error("Le token Kyros ne contient pas de sub.");
  }

  if (claims.resource_aud !== kyrosResourceAudience) {
    throw new Error("Le token Kyros vise une autre application.");
  }

  if (claims.client_id !== kyrosClientId) {
    throw new Error("Le client Kyros est invalide.");
  }

  const grantedScopes = new Set(
    String(claims.scope ?? "")
      .split(/\s+/)
      .filter(Boolean)
  );

  const missingScope = requiredScopes.find(
    (scope) => !grantedScopes.has(scope)
  );

  if (missingScope) {
    throw new Error(`Scope Kyros manquant : ${missingScope}`);
  }

  return claims;
}

async function requestKyrosTokens(
  body: Record<string, string>
): Promise<KyrosTokenResponse> {
  const response = await fetch(`${kyrosBaseUrl}/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = (await response.json().catch(() => null)) as
    | KyrosTokenResponse
    | { error?: string }
    | null;

  if (
    !response.ok ||
    !payload ||
    !("access_token" in payload) ||
    !("refresh_token" in payload)
  ) {
    const providerError =
      payload && "error" in payload
        ? payload.error
        : "kyros_request_failed";

    throw new Error(`Kyros a refusé la requête : ${providerError}`);
  }

  return payload;
}

async function refreshSessionIfNeeded(
  request: FastifyRequest
): Promise<boolean> {
  const session = request.session;

  if (!session.user || !session.kyros) {
    return false;
  }

  if (session.kyros.accessTokenExpiresAt > Date.now() + 30_000) {
    return true;
  }

  try {
    const tokens = await requestKyrosTokens({
      grant_type: "refresh_token",
      client_id: kyrosClientId,
      client_secret: kyrosClientSecret,
      refresh_token: session.kyros.refreshToken
    });

    const claims = verifyAccessToken(tokens.access_token);
    const username =
      tokens.user?.username ??
      claims.username ??
      String(claims.sub);

    session.user = {
      id: String(claims.sub),
      username,
      displayName:
        tokens.user?.displayName ??
        claims.display_name ??
        username
    };

    session.kyros = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: Number(claims.exp) * 1000
    };

    return true;
  } catch {
    await session.destroy();
    return false;
  }
}

async function requireSession(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authenticated = await refreshSessionIfNeeded(request);

  if (!authenticated || !request.session.user) {
    return reply.code(401).send({
      error: "Connexion Kyros requise."
    });
  }

  request.currentUser = request.session.user;
}

app.get("/auth/login", async (request, reply) => {
  const state = crypto.randomBytes(32).toString("base64url");

  request.session.kyrosAuthorization = {
    state,
    createdAt: Date.now()
  };

  const authorizeUrl = new URL(`${kyrosBaseUrl}/authorize`);

  authorizeUrl.searchParams.set("client_id", kyrosClientId);
  authorizeUrl.searchParams.set(
    "redirect_uri",
    `${appBaseUrl}/auth/callback`
  );
  authorizeUrl.searchParams.set("scope", requestedScopes);
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

  if (request.query.error) {
    return reply.code(401).send({
      error: "Connexion Kyros annulée ou refusée."
    });
  }

  if (
    !pending ||
    Date.now() - pending.createdAt > 10 * 60 * 1000 ||
    !request.query.state ||
    pending.state !== request.query.state
  ) {
    return reply.code(400).send({
      error: "État Kyros invalide ou expiré."
    });
  }

  if (!request.query.code) {
    return reply.code(400).send({
      error: "Code Kyros absent."
    });
  }

  const tokens = await requestKyrosTokens({
    grant_type: "authorization_code",
    client_id: kyrosClientId,
    client_secret: kyrosClientSecret,
    code: request.query.code,
    redirect_uri: `${appBaseUrl}/auth/callback`
  });

  const claims = verifyAccessToken(tokens.access_token);
  const username =
    tokens.user?.username ??
    claims.username ??
    String(claims.sub);

  await request.session.regenerate();

  request.session.user = {
    id: String(claims.sub),
    username,
    displayName:
      tokens.user?.displayName ??
      claims.display_name ??
      username
  };

  request.session.kyros = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpiresAt: Number(claims.exp) * 1000
  };

  return reply.redirect("/");
});

app.get("/api/session", async (request) => {
  const authenticated = await refreshSessionIfNeeded(request);

  return {
    authenticated,
    user: authenticated ? request.session.user : null,
    authentication: {
      provider: "kyros",
      available: true
    }
  };
});

app.post("/api/auth/logout", async (request, reply) => {
  const refreshToken = request.session.kyros?.refreshToken;

  if (refreshToken) {
    await fetch(`${kyrosBaseUrl}/revoke`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        client_id: kyrosClientId,
        client_secret: kyrosClientSecret,
        refresh_token: refreshToken
      })
    }).catch(() => undefined);
  }

  await request.session.destroy();

  reply.clearCookie("braindump.sid", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return {
    success: true
  };
});

app.get(
  "/api/notes",
  { preHandler: requireSession },
  async () => listNotes()
);

app.post(
  "/api/analyze",
  { preHandler: requireSession },
  async (request, reply) => {
    const result = noteSchema.safeParse(request.body);

    if (!result.success) {
      return reply.code(400).send({
        error: "Note invalide."
      });
    }

    return classifyNote(result.data.content);
  }
);

app.post(
  "/api/notes",
  { preHandler: requireSession },
  async (request, reply) => {
    const result = noteSchema.safeParse(request.body);

    if (!result.success) {
      return reply.code(400).send({
        error: "Note invalide."
      });
    }

    const classification = classifyNote(result.data.content);

    return reply
      .code(201)
      .send(createNote(result.data.content, classification));
  }
);

app.delete<{ Params: { id: string } }>(
  "/api/notes/:id",
  { preHandler: requireSession },
  async (request, reply) => {
    const id = Number(request.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return reply.code(400).send({
        error: "Identifiant invalide."
      });
    }

    if (!deleteNote(id)) {
      return reply.code(404).send({
        error: "Note introuvable."
      });
    }

    return reply.code(204).send();
  }
);

app.setNotFoundHandler((request, reply) => {
  if (
    request.url.startsWith("/api/") ||
    request.url.startsWith("/auth/")
  ) {
    return reply.code(404).send({
      error: "Route introuvable."
    });
  }

  return reply.sendFile("index.html");
});

await app.listen({
  port,
  host: "0.0.0.0"
});