// src/integrations/store.ts
import type Database from "better-sqlite3";
import { createHash, randomBytes } from "node:crypto";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const secret = () => randomBytes(32).toString("base64url");
export class IntegrationError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function check(value: unknown, message = "Accès refusé."): asserts value {
  if (!value) throw new IntegrationError(403, message);
}
type Client = {
  id: string;
  owner_id: string;
  name: string;
  redirect_uri: string;
  key_hash: string;
  revoked_at: number | null;
};
type Grant = {
  id: string;
  client_id: string;
  user_id: string;
  access_hash: string;
  refresh_hash: string;
  access_expires: number;
  refresh_expires: number;
  revoked_at: number | null;
};
export function createIntegrationStore(db: Database.Database, issuer: string) {
  db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS connected_apps (
        id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL,
        redirect_uri TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, revoked_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS app_codes (
        hash TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES connected_apps(id), user_id TEXT NOT NULL,
        challenge TEXT NOT NULL, redirect_uri TEXT NOT NULL, expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS app_grants (
        id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES connected_apps(id), user_id TEXT NOT NULL,
        access_hash TEXT NOT NULL UNIQUE, refresh_hash TEXT NOT NULL UNIQUE,
        access_expires INTEGER NOT NULL, refresh_expires INTEGER NOT NULL, created_at INTEGER NOT NULL, revoked_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS app_grants_user ON app_grants(user_id);
      INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(3,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    `);
  })();
  function client(id: string) {
    const c = db
      .prepare("SELECT * FROM connected_apps WHERE id=? AND revoked_at IS NULL")
      .get(id) as Client | undefined;
    check(c, "Application inconnue ou révoquée.");
    return c;
  }
  function authenticate(key: string) {
    check(key.length >= 30 && key.length <= 100);
    const c = db
      .prepare(
        "SELECT * FROM connected_apps WHERE key_hash=? AND revoked_at IS NULL",
      )
      .get(hash(key)) as Client | undefined;
    check(c, "Clé d’application refusée.");
    return c;
  }
  function credentials(c: Client, user: string, id?: string) {
    const access = secret(),
      refresh = secret(),
      now = Date.now();
    if (id)
      db.prepare(
        "UPDATE app_grants SET access_hash=?,refresh_hash=?,access_expires=?,refresh_expires=? WHERE id=? AND revoked_at IS NULL",
      ).run(hash(access), hash(refresh), now + 900000, now + 30 * 86400000, id);
    else
      db.prepare(
        "INSERT INTO app_grants(id,client_id,user_id,access_hash,refresh_hash,access_expires,refresh_expires,created_at) VALUES(?,?,?,?,?,?,?,?)",
      ).run(
        secret(),
        c.id,
        user,
        hash(access),
        hash(refresh),
        now + 900000,
        now + 30 * 86400000,
        now,
      );
    return {
      access_token: access,
      refresh_token: refresh,
      expires_in: 900,
      scope: "notes:dated:read",
      sub: user,
      identity_issuer: issuer,
    };
  }
  return {
    client,
    authenticate,
    register(owner: string, name: string, redirect: string) {
      const count = db
        .prepare(
          "SELECT count(*) n FROM connected_apps WHERE owner_id=? AND revoked_at IS NULL",
        )
        .get(owner) as { n: number };
      check(count.n < 10, "Dix applications actives maximum.");
      const id = secret(),
        key = secret();
      db.prepare(
        "INSERT INTO connected_apps(id,owner_id,name,redirect_uri,key_hash,created_at) VALUES(?,?,?,?,?,?)",
      ).run(id, owner, name, redirect, hash(key), Date.now());
      return { client_id: id, api_key: key, name, redirect_uri: redirect };
    },
    list(owner: string) {
      return db
        .prepare(
          "SELECT id,name,redirect_uri,created_at FROM connected_apps WHERE owner_id=? AND revoked_at IS NULL ORDER BY created_at DESC",
        )
        .all(owner);
    },
    grants(user: string) {
      return db
        .prepare(
          "SELECT g.id,c.name,c.redirect_uri,g.created_at FROM app_grants g JOIN connected_apps c ON c.id=g.client_id WHERE g.user_id=? AND g.revoked_at IS NULL AND g.refresh_expires>? AND c.revoked_at IS NULL ORDER BY g.created_at DESC",
        )
        .all(user, Date.now());
    },
    rotate(owner: string, id: string) {
      return db.transaction(() => {
        const c = client(id);
        check(c.owner_id === owner);
        const key = secret();
        db.prepare("UPDATE connected_apps SET key_hash=? WHERE id=?").run(
          hash(key),
          id,
        );
        db.prepare("DELETE FROM app_codes WHERE client_id=?").run(id);
        db.prepare(
          "UPDATE app_grants SET revoked_at=? WHERE client_id=? AND revoked_at IS NULL",
        ).run(Date.now(), id);
        return { client_id: id, api_key: key };
      })();
    },
    revokeClient(owner: string, id: string) {
      db.transaction(() => {
        const c = client(id);
        check(c.owner_id === owner);
        db.prepare("UPDATE connected_apps SET revoked_at=? WHERE id=?").run(
          Date.now(),
          id,
        );
        db.prepare("DELETE FROM app_codes WHERE client_id=?").run(id);
        db.prepare(
          "UPDATE app_grants SET revoked_at=? WHERE client_id=? AND revoked_at IS NULL",
        ).run(Date.now(), id);
      })();
    },
    revokeGrant(user: string, id: string) {
      check(
        db
          .prepare(
            "UPDATE app_grants SET revoked_at=? WHERE id=? AND user_id=? AND revoked_at IS NULL",
          )
          .run(Date.now(), id, user).changes,
      );
    },
    authorize(c: Client, user: string, redirect: string, challenge: string) {
      check(
        c.redirect_uri === redirect,
        "URL de retour différente de celle enregistrée.",
      );
      const code = secret();
      db.prepare("DELETE FROM app_codes WHERE expires_at<?").run(Date.now());
      db.prepare(
        "INSERT INTO app_codes(hash,client_id,user_id,challenge,redirect_uri,expires_at) VALUES(?,?,?,?,?,?)",
      ).run(hash(code), c.id, user, challenge, redirect, Date.now() + 300000);
      return code;
    },
    exchange(c: Client, code: string, redirect: string, verifier: string) {
      return db.transaction(() => {
        const row = db
          .prepare(
            "SELECT * FROM app_codes WHERE hash=? AND client_id=? AND expires_at>?",
          )
          .get(hash(code), c.id, Date.now()) as
          | { user_id: string; challenge: string; redirect_uri: string }
          | undefined;
        check(
          row &&
            row.redirect_uri === redirect &&
            createHash("sha256").update(verifier).digest("base64url") ===
              row.challenge,
          "Code expiré, déjà utilisé ou PKCE invalide.",
        );
        db.prepare("DELETE FROM app_codes WHERE hash=?").run(hash(code));
        // Reconnecting the same account replaces the previous authorization.
        db.prepare(
          "UPDATE app_grants SET revoked_at=? WHERE client_id=? AND user_id=? AND revoked_at IS NULL",
        ).run(Date.now(), c.id, row.user_id);
        return credentials(c, row.user_id);
      })();
    },
    refresh(c: Client, refresh: string) {
      return db.transaction(() => {
        const g = db
          .prepare(
            "SELECT * FROM app_grants WHERE client_id=? AND refresh_hash=? AND revoked_at IS NULL AND refresh_expires>?",
          )
          .get(c.id, hash(refresh), Date.now()) as Grant | undefined;
        check(g, "Autorisation expirée ou révoquée.");
        return credentials(c, g.user_id, g.id);
      })();
    },
    revoke(c: Client, refresh: string) {
      db.prepare(
        "UPDATE app_grants SET revoked_at=? WHERE client_id=? AND refresh_hash=? AND revoked_at IS NULL",
      ).run(Date.now(), c.id, hash(refresh));
    },
    notes(c: Client, access: string) {
      const g = db
        .prepare(
          "SELECT * FROM app_grants WHERE client_id=? AND access_hash=? AND revoked_at IS NULL AND access_expires>? AND refresh_expires>?",
        )
        .get(c.id, hash(access), Date.now(), Date.now()) as Grant | undefined;
      check(g, "Autorisez votre compte BrainDump ou renouvelez la connexion.");
      const rows = db
        .prepare(
          "SELECT id,user_id userId,title,content,type,due_at dueAt,created_at createdAt,updated_at updatedAt,archived_at archivedAt FROM dumps WHERE user_id=? AND type='note' AND due_at IS NOT NULL AND archived_at IS NULL ORDER BY id LIMIT 501",
        )
        .all(g.user_id);
      if (rows.length > 500)
        throw new IntegrationError(
          409,
          "Plus de 500 notes datées : aucune copie partielle n’est envoyée.",
        );
      return { data: rows, sub: g.user_id, identity_issuer: issuer };
    },
  };
}
