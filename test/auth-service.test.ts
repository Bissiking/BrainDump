import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { createAuthService } from "../src/auth/auth-service.js";
import type { AuthConfig } from "../src/auth/auth-config.js";

const jwtSecret = "test-secret-with-at-least-thirty-two-characters";
const config: AuthConfig = {
  appBaseUrl: "https://braindump.test",
  baseUrl: "https://kyros.test",
  clientId: "cli_braindump",
  clientSecret: "secret",
  jwtSecret,
  issuer: "kyros",
  audience: "kyros-modules",
  resourceAudience: "kyros:sso:braindump",
  requestedScopes: "profile email braindump:access",
  requiredScopes: ["profile", "email", "braindump:access"],
  apiRequiredScopes: ["braindump:access"],
  lumaClientId: "cli_luma_os",
  lumaResourceAudience: "kyros:sso:luma-os"
};

function token(overrides: Record<string, unknown> = {}) {
  return jwt.sign({
    sub: "kyros-user-1",
    username: "matheo",
    display_name: "Mathéo",
    resource_aud: "kyros:sso:luma-os",
    client_id: "cli_luma_os",
    scope: "profile email braindump:access",
    ...overrides
  }, jwtSecret, {
    algorithm: "HS256",
    issuer: "kyros",
    audience: "kyros-modules",
    expiresIn: "5m"
  });
}

function replyRecorder() {
  return {
    status: 200,
    payload: null as unknown,
    code(status: number) { this.status = status; return this; },
    send(payload: unknown) { this.payload = payload; return this; }
  };
}

test("accepte le bearer Kyros LUMA et expose son sujet comme propriétaire", async () => {
  const auth = createAuthService(config);
  const request = {
    headers: { authorization: `Bearer ${token()}` },
    session: {}
  } as any;
  const reply = replyRecorder();

  await auth.requireSession(request, reply as any);

  assert.equal(reply.status, 200);
  assert.deepEqual(request.currentUser, {
    id: "kyros-user-1",
    username: "matheo",
    displayName: "Mathéo"
  });
});

test("refuse un bearer LUMA sans scope BrainDump", async () => {
  const auth = createAuthService(config);
  const request = {
    headers: { authorization: `Bearer ${token({ scope: "profile email" })}` },
    session: {}
  } as any;
  const reply = replyRecorder();

  await auth.requireSession(request, reply as any);

  assert.equal(reply.status, 401);
  assert.equal(request.currentUser, undefined);
});
