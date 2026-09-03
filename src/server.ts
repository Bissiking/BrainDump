// src/server.ts
import "dotenv/config";
import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import fastifyStatic from "@fastify/static";
import { resolve } from "node:path";
import { registerApiRoutes } from "./api-routes.js";
import { loadAuthConfig } from "./auth/auth-config.js";
import { registerAuthRoutes } from "./auth/auth-routes.js";
import { createAuthService } from "./auth/auth-service.js";

if(!process.env.SESSION_SECRET)throw new Error("Variable d'environnement absente : SESSION_SECRET");
const port=Number(process.env.PORT??3005);
const app=Fastify({logger:{redact:["req.headers.authorization","req.headers.cookie","res.headers.set-cookie","body.client_secret","body.refresh_token","body.code","body.code_verifier"]}});
const auth=createAuthService(loadAuthConfig(port));
await app.register(fastifyCookie);
await app.register(fastifySession,{secret:process.env.SESSION_SECRET,cookieName:"braindump.sid",saveUninitialized:false,cookie:{path:"/",httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:7*24*60*60*1000}});
await app.register(fastifyStatic,{root:resolve("public"),prefix:"/",index:false});
await registerAuthRoutes(app,auth);
await registerApiRoutes(app,auth);
app.get("/",async(request,reply)=>await auth.refreshSessionIfNeeded(request)?reply.sendFile("index.html"):reply.redirect("/login"));
app.get("/login",async(request,reply)=>await auth.refreshSessionIfNeeded(request)?reply.redirect("/"):reply.sendFile("login.html"));
app.setErrorHandler((error,request,reply)=>{request.log.error({err:error},"Erreur non gérée");const api=request.url.startsWith("/api/");return reply.code(500).send(api?{error:"Une erreur interne empêche cette action."}:"Erreur interne")});
app.setNotFoundHandler((request,reply)=>request.url.startsWith("/api/")||request.url.startsWith("/auth/")?reply.code(404).send({error:"Route introuvable."}):reply.redirect("/"));
await app.listen({port,host:"0.0.0.0"});
