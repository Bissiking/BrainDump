import "dotenv/config";
import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import fastifyStatic from "@fastify/static";
import { resolve } from "node:path";
import { z } from "zod";
import { loadAuthConfig } from "./auth/auth-config.js";
import { registerAuthRoutes } from "./auth/auth-routes.js";
import { createAuthService } from "./auth/auth-service.js";
import { classifyNote } from "./classifier/classify.js";
import {
  createNote,
  deleteNote,
  listNotes
} from "./database/database.js";

if (!process.env.SESSION_SECRET) {
  throw new Error("Variable d'environnement absente : SESSION_SECRET");
}

const port = Number(process.env.PORT ?? 3005);
const app = Fastify({ logger: true });
const auth = createAuthService(loadAuthConfig(port));
const noteSchema = z.object({
  content: z.string().trim().min(2).max(5000)
});

await app.register(fastifyCookie);
await app.register(fastifySession, {
  secret: process.env.SESSION_SECRET,
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
  prefix: "/",
  index: false
});

await registerAuthRoutes(app, auth);

app.get("/", async (request, reply) => {
  if (!(await auth.refreshSessionIfNeeded(request))) {
    return reply.redirect("/login");
  }
  return reply.sendFile("index.html");
});

app.get("/login", async (request, reply) => {
  if (await auth.refreshSessionIfNeeded(request)) {
    return reply.redirect("/");
  }
  return reply.sendFile("login.html");
});

app.get(
  "/api/notes",
  { preHandler: auth.requireSession },
  async () => listNotes()
);

app.post(
  "/api/analyze",
  { preHandler: auth.requireSession },
  async (request, reply) => {
    const result = noteSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        error: "Écris au moins deux caractères avant d’analyser."
      });
    }
    return classifyNote(result.data.content);
  }
);

app.post(
  "/api/notes",
  { preHandler: auth.requireSession },
  async (request, reply) => {
    const result = noteSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        error: "Écris au moins deux caractères avant d’enregistrer."
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
  { preHandler: auth.requireSession },
  async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return reply.code(400).send({ error: "Identifiant invalide." });
    }
    if (!deleteNote(id)) {
      return reply.code(404).send({ error: "Note introuvable." });
    }
    return reply.code(204).send();
  }
);

app.setNotFoundHandler((request, reply) => {
  if (
    request.url.startsWith("/api/") ||
    request.url.startsWith("/auth/")
  ) {
    return reply.code(404).send({ error: "Route introuvable." });
  }
  return reply.redirect("/");
});

await app.listen({ port, host: "0.0.0.0" });
