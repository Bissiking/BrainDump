import type {
  FastifyReply,
  FastifyRequest
} from "fastify";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { AuthConfig } from "./auth-config.js";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
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
  user?: {
    id?: string;
    username?: string;
    displayName?: string;
  };
}

declare module "fastify" {
  interface Session {
    kyrosAuthorization?: {
      state: string;
      createdAt: number;
    };
    user?: AuthUser;
    kyros?: {
      accessToken: string;
      refreshToken: string;
      accessTokenExpiresAt: number;
    };
  }

  interface FastifyRequest {
    currentUser?: AuthUser;
  }
}

export function createAuthService(config: AuthConfig) {
  function verifyAccessToken(
    accessToken: string,
    { apiRequest = false } = {}
  ): KyrosClaims {
    const claims = jwt.verify(accessToken, config.jwtSecret, {
      algorithms: ["HS256"],
      issuer: config.issuer,
      audience: config.audience,
      clockTolerance: 5
    }) as KyrosClaims;

    if (!claims.sub || !claims.exp) {
      throw new Error("Le token Kyros est incomplet.");
    }

    const ownApplication =
      claims.resource_aud === config.resourceAudience &&
      claims.client_id === config.clientId;
    const lumaApplication =
      apiRequest &&
      Boolean(config.lumaClientId && config.lumaResourceAudience) &&
      claims.resource_aud === config.lumaResourceAudience &&
      claims.client_id === config.lumaClientId;

    if (!ownApplication && !lumaApplication) {
      throw new Error("Le token Kyros ne vise pas une application autorisée.");
    }

    const grantedScopes = new Set(
      String(claims.scope ?? "")
        .split(/\s+/)
        .filter(Boolean)
    );
    const requiredScopes = apiRequest
      ? config.apiRequiredScopes
      : config.requiredScopes;
    const missingScope = requiredScopes.find(
      (scope) => !grantedScopes.has(scope)
    );

    if (missingScope) {
      throw new Error(`Scope Kyros manquant : ${missingScope}`);
    }

    return claims;
  }

  async function requestTokens(
    body: Record<string, string>
  ): Promise<KyrosTokenResponse> {
    const response = await fetch(`${config.baseUrl}/token`, {
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

  async function storeSession(
    request: FastifyRequest,
    tokens: KyrosTokenResponse,
    regenerate = false
  ) {
    const claims = verifyAccessToken(tokens.access_token);
    const username =
      tokens.user?.username ?? claims.username ?? String(claims.sub);

    if (regenerate) {
      await request.session.regenerate();
    }

    request.session.user = {
      id: String(claims.sub),
      username,
      displayName:
        tokens.user?.displayName ?? claims.display_name ?? username
    };
    request.session.kyros = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: claims.exp! * 1000
    };
  }

  async function refreshSessionIfNeeded(
    request: FastifyRequest
  ): Promise<boolean> {
    const { session } = request;

    if (!session.user || !session.kyros) return false;
    if (session.kyros.accessTokenExpiresAt > Date.now() + 30_000) {
      return true;
    }

    try {
      const tokens = await requestTokens({
        grant_type: "refresh_token",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: session.kyros.refreshToken
      });
      await storeSession(request, tokens);
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
    const authorization = request.headers.authorization;
    if (authorization?.startsWith("Bearer ")) {
      try {
        const claims = verifyAccessToken(
          authorization.slice("Bearer ".length).trim(),
          { apiRequest: true }
        );
        const username = claims.username ?? String(claims.sub);
        request.currentUser = {
          id: String(claims.sub),
          username,
          displayName: claims.display_name ?? username
        };
        return;
      } catch {
        return reply.code(401).send({
          error: "Le jeton Kyros transmis à BrainDump est invalide."
        });
      }
    }

    const authenticated = await refreshSessionIfNeeded(request);

    if (!authenticated || !request.session.user) {
      return reply.code(401).send({
        error: "Ta session a expiré. Reconnecte-toi pour continuer."
      });
    }

    request.currentUser = request.session.user;
  }

  async function exchangeAuthorizationCode(
    request: FastifyRequest,
    code: string
  ) {
    const tokens = await requestTokens({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: `${config.appBaseUrl}/auth/callback`
    });
    await storeSession(request, tokens, true);
  }

  async function logout(request: FastifyRequest) {
    const refreshToken = request.session.kyros?.refreshToken;

    if (refreshToken) {
      await fetch(`${config.baseUrl}/revoke`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken
        })
      }).catch(() => undefined);
    }

    await request.session.destroy();
  }

  return {
    config,
    exchangeAuthorizationCode,
    logout,
    refreshSessionIfNeeded,
    requireSession
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
