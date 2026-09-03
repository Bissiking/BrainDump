// src/auth/auth-routes.ts
import crypto from "node:crypto";
import type { FastifyInstance,FastifyReply } from "fastify";
import type { AuthService } from "./auth-service.js";
const authorizationLifetime=10*60*1000;
function loginError(reply:FastifyReply,code:string){return reply.redirect(`/login?error=${encodeURIComponent(code)}`)}
export async function registerAuthRoutes(app:FastifyInstance,auth:AuthService){
  app.get("/auth/login",async(request,reply)=>{if(await auth.refreshSessionIfNeeded(request))return reply.redirect("/");const state=crypto.randomBytes(32).toString("base64url");const codeVerifier=crypto.randomBytes(64).toString("base64url");const challenge=crypto.createHash("sha256").update(codeVerifier).digest("base64url");
    try{const requestUri=await auth.createParRequest(state,challenge);request.session.kyrosAuthorization={state,codeVerifier,createdAt:Date.now()};const url=new URL(`${auth.config.baseUrl}/authorize`);url.searchParams.set("client_id",auth.config.clientId);url.searchParams.set("request_uri",requestUri);return reply.redirect(url.toString())}catch(error){request.log.warn({err:error},"Échec de la requête PAR Kyros");return loginError(reply,"provider")}});
  app.get<{Querystring:{code?:string;state?:string;iss?:string;error?:string}}>("/auth/callback",async(request,reply)=>{const pending=request.session.kyrosAuthorization;delete request.session.kyrosAuthorization;if(request.query.error)return loginError(reply,"cancelled");if(!pending||Date.now()-pending.createdAt>authorizationLifetime||!request.query.state||pending.state!==request.query.state)return loginError(reply,"expired");if(request.query.iss!==auth.config.issuer)return loginError(reply,"issuer");if(!request.query.code)return loginError(reply,"missing_code");try{await auth.exchangeAuthorizationCode(request,request.query.code,pending.codeVerifier);return reply.redirect("/")}catch(error){request.log.warn({err:error},"Échec de connexion Kyros V4");return loginError(reply,"provider")}});
  app.get("/api/session",async(request)=>{const authenticated=await auth.refreshSessionIfNeeded(request);return{authenticated,user:authenticated?request.session.user:null,authentication:{provider:"kyros",version:"v4",available:true}}});
  app.post("/api/auth/logout",async(request,reply)=>{await auth.logout(request);reply.clearCookie("braindump.sid",{path:"/",httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production"});return{success:true}});
}
