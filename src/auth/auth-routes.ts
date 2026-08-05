// src/auth/auth-routes.ts

import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";

export async function authRoutes(app: FastifyInstance) {
  app.get("/auth/login", async (request, reply) => {
    const state = crypto.randomBytes(32).toString("base64url");

    request.session.kyrosAuthorization = {
      state,
      createdAt: Date.now()
    };

    const authorizeUrl = new URL(
      `${process.env.KYROS_BASE_URL}/authorize`
    );

    authorizeUrl.searchParams.set(
      "client_id",
      process.env.KYROS_CLIENT_ID!
    );

    authorizeUrl.searchParams.set(
      "redirect_uri",
      `${process.env.APP_BASE_URL}/auth/callback`
    );

    authorizeUrl.searchParams.set(
      "scope",
      process.env.KYROS_REQUESTED_SCOPES!
    );

    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("state", state);

    return reply.redirect(authorizeUrl.toString());
  });
}