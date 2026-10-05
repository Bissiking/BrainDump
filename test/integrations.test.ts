// test/integrations.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import { registerIntegrationRoutes } from "../src/integrations/routes.js";
test("applications, consentement PKCE, identité, notes datées seulement, rotation et révocation", async () => {
  const db = new Database(":memory:");
  db.pragma("foreign_keys=ON");
  db.exec(
    `CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL);CREATE TABLE dumps(id INTEGER PRIMARY KEY,user_id TEXT,title TEXT,content TEXT,type TEXT,due_at TEXT,created_at TEXT,updated_at TEXT,archived_at TEXT);`,
  );
  for (const [id, user, type, due, archived] of [
    [1, "alice", "note", "2026-10-06T10:00:00Z", null],
    [2, "bob", "note", "2026-10-06T10:00:00Z", null],
    [3, "alice", "task", "2026-10-06T10:00:00Z", null],
    [4, "alice", "note", null, null],
    [5, "alice", "note", "2026-10-06T10:00:00Z", "2026-10-05"],
  ])
    db.prepare(
      "INSERT INTO dumps VALUES(?,?,?,'Contenu',?,?, '2026-10-05T10:00:00Z','2026-10-05T10:00:00Z',?)",
    ).run(id, user, "Note", type, due, archived);
  const app = Fastify();
  await app.register(cookie);
  await app.register(session, {
    secret: "test-session-secret-longer-than-32-characters",
    cookie: { secure: false },
  });
  let owner = "alice";
  const auth = {
    config: {
      appBaseUrl: "http://localhost:3005",
      issuer: "https://kyros.example",
    },
    refreshSessionIfNeeded: async (req: any) => {
      req.session.user = { id: owner, displayName: "Alice", username: owner };
      return true;
    },
  } as any;
  await registerIntegrationRoutes(app, auth, db);
  const headers = { origin: "http://localhost:3005" };
  try {
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/integrations/clients",
          headers: { origin: "https://evil.example" },
          payload: {
            name: "X",
            redirect_uri: "https://liora.example/api/v1/integration-callback",
          },
        })
      ).statusCode,
      403,
    );
    const created = await app.inject({
      method: "POST",
      url: "/api/integrations/clients",
      headers,
      payload: {
        name: "Liora <script>",
        redirect_uri: "https://liora.example/api/v1/integration-callback",
      },
    });
    assert.equal(created.statusCode, 201);
    const client = created.json();
    const appHeaders = { authorization: "Bearer " + client.api_key };
    assert.equal(
      (
        await app.inject({
          url: "/api/integrations/capabilities",
          headers: appHeaders,
        })
      ).json().provider,
      "braindump",
    );
    assert.ok(
      !JSON.stringify(
        db.prepare("SELECT * FROM connected_apps").all(),
      ).includes(client.api_key),
    );
    const verifier = "v".repeat(43),
      state = "s".repeat(43),
      params = {
        client_id: client.client_id,
        redirect_uri: "https://liora.example/api/v1/integration-callback",
        state,
        code_challenge: createHash("sha256")
          .update(verifier)
          .digest("base64url"),
        code_challenge_method: "S256",
      };
    assert.equal(
      (
        await app.inject({
          url:
            "/integrations/authorize?" +
            new URLSearchParams({
              ...params,
              redirect_uri: "https://evil.example",
            }),
        })
      ).statusCode,
      400,
    );
    const consent = await app.inject({
      url: "/integrations/authorize?" + new URLSearchParams(params),
    });
    assert.equal(consent.statusCode, 200);
    assert.equal(consent.headers["referrer-policy"], "same-origin");
    assert.ok(consent.body.includes("&lt;script&gt;"));
    assert.ok(!consent.body.includes("Liora <script>"));
    const cookies = consent.cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const csrf = /name="csrf" value="([^"]+)"/.exec(consent.body)![1];
    const allowed = await app.inject({
      method: "POST",
      url: "/integrations/authorize",
      headers: { ...headers, cookie: cookies },
      payload: { ...params, csrf, decision: "allow" },
    });
    assert.equal(allowed.statusCode, 302);
    const code = new URL(allowed.headers.location!).searchParams.get("code");
    assert.equal(
      (
        await app.inject({
          url: "/api/integrations/notes",
          headers: { ...appHeaders, "x-braindump-user-token": "z".repeat(43) },
        })
      ).statusCode,
      403,
    );
    const exchange = {
      grant_type: "authorization_code",
      code,
      redirect_uri: params.redirect_uri,
      code_verifier: verifier,
    };
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/integrations/token",
          headers: appHeaders,
          payload: { ...exchange, code_verifier: "w".repeat(43) },
        })
      ).statusCode,
      403,
    );
    const tokensResponse = await app.inject({
      method: "POST",
      url: "/api/integrations/token",
      headers: appHeaders,
      payload: exchange,
    });
    assert.equal(tokensResponse.statusCode, 200);
    const tokens = tokensResponse.json();
    assert.equal(tokens.sub, "alice");
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/integrations/token",
          headers: appHeaders,
          payload: exchange,
        })
      ).statusCode,
      403,
    );
    const grantHeaders = {
      ...appHeaders,
      "x-braindump-user-token": tokens.access_token,
    };
    const notes = (
      await app.inject({
        url: "/api/integrations/notes",
        headers: grantHeaders,
      })
    ).json();
    assert.deepEqual(
      notes.data.map((n: any) => n.id),
      [1],
    );
    assert.ok(
      !JSON.stringify(db.prepare("SELECT * FROM app_grants").all()).includes(
        tokens.refresh_token,
      ),
    );
    assert.equal(
      (
        await app.inject({
          method: "PATCH",
          url: "/api/integrations/notes",
          headers: grantHeaders,
          payload: { title: "Modifier" },
        })
      ).statusCode,
      404,
    );
    const refreshed = (
      await app.inject({
        method: "POST",
        url: "/api/integrations/token",
        headers: appHeaders,
        payload: {
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token,
        },
      })
    ).json();
    assert.equal(
      (
        await app.inject({
          url: "/api/integrations/notes",
          headers: grantHeaders,
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/integrations/token",
          headers: appHeaders,
          payload: {
            grant_type: "refresh_token",
            refresh_token: tokens.refresh_token,
          },
        })
      ).statusCode,
      403,
    );
    owner = "bob";
    assert.equal(
      (
        await app.inject({
          method: "DELETE",
          url: "/api/integrations/clients/" + client.client_id,
          headers,
        })
      ).statusCode,
      403,
    );
    owner = "alice";
    const grant = (
      await app.inject({ url: "/api/integrations/clients" })
    ).json().grants[0];
    assert.equal(
      (
        await app.inject({
          method: "DELETE",
          url: "/api/integrations/grants/" + grant.id,
          headers,
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (
        await app.inject({
          url: "/api/integrations/notes",
          headers: {
            ...appHeaders,
            "x-braindump-user-token": refreshed.access_token,
          },
        })
      ).statusCode,
      403,
    );
    const rotated = (
      await app.inject({
        method: "POST",
        url: "/api/integrations/clients/" + client.client_id + "/rotate",
        headers,
      })
    ).json();
    assert.equal(
      (
        await app.inject({
          url: "/api/integrations/capabilities",
          headers: appHeaders,
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await app.inject({
          url: "/api/integrations/capabilities",
          headers: { authorization: "Bearer " + rotated.api_key },
        })
      ).statusCode,
      200,
    );
    await app.inject({
      method: "DELETE",
      url: "/api/integrations/clients/" + client.client_id,
      headers,
    });
    assert.equal(
      (
        await app.inject({
          url: "/api/integrations/capabilities",
          headers: { authorization: "Bearer " + rotated.api_key },
        })
      ).statusCode,
      403,
    );
    assert.equal(db.prepare("SELECT count(*) n FROM dumps").get()!.n, 5);
  } finally {
    await app.close();
    db.close();
  }
});
