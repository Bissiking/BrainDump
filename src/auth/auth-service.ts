// src/auth/auth-service.ts
import { createPublicKey, type KeyObject } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";
import type { AuthConfig } from "./auth-config.js";

export interface AuthUser{id:string;username:string;displayName:string}
interface KyrosClaims extends JwtPayload{sub:string;username?:string;display_name?:string;resource_aud?:string;client_id?:string;scope?:string}
interface KyrosTokenResponse{access_token:string;refresh_token:string;user?:{id?:string;username?:string;displayName?:string}}
interface Jwk extends JsonWebKey{kid?:string;kty:string;use?:string;alg?:string}
declare module "fastify"{
  interface Session{kyrosAuthorization?:{state:string;codeVerifier:string;createdAt:number};user?:AuthUser;kyros?:{accessToken:string;refreshToken:string;accessTokenExpiresAt:number}}
  interface FastifyRequest{currentUser?:AuthUser}
}

export function createAuthService(config:AuthConfig){
  let jwksCache:{expiresAt:number;keys:Jwk[]}|null=null;
  async function getVerificationKey(token:string):Promise<KeyObject>{
    const decoded=jwt.decode(token,{complete:true}) as {header:JwtHeader}|null;if(!decoded?.header.kid)throw new Error("Le token Kyros ne contient pas de kid.");
    if(!jwksCache||jwksCache.expiresAt<Date.now()){
      const response=await fetch(config.jwksUrl,{headers:{accept:"application/json"}});if(!response.ok)throw new Error("Le JWKS Kyros est indisponible.");
      const payload=await response.json() as {keys?:Jwk[]};if(!Array.isArray(payload.keys))throw new Error("Le JWKS Kyros est invalide.");jwksCache={keys:payload.keys,expiresAt:Date.now()+5*60_000};
    }
    const jwk=jwksCache.keys.find((key)=>key.kid===decoded.header.kid&&key.kty==="RSA"&&(key.use==null||key.use==="sig"));
    if(!jwk){jwksCache=null;throw new Error("La clé de signature Kyros est inconnue.");}return createPublicKey({key:jwk,format:"jwk"});
  }
  async function verifyAccessToken(accessToken:string,{apiRequest=false}={}):Promise<KyrosClaims>{
    const key=await getVerificationKey(accessToken);const claims=jwt.verify(accessToken,key,{algorithms:["RS256"],issuer:config.issuer,audience:config.audience,clockTolerance:5}) as KyrosClaims;
    if(!claims.sub||!claims.exp||!claims.nbf||!claims.jti)throw new Error("Le token Kyros V4 est incomplet.");
    const own=claims.resource_aud===config.resourceAudience&&claims.client_id===config.clientId;
    const luma=apiRequest&&Boolean(config.lumaClientId&&config.lumaResourceAudience)&&claims.resource_aud===config.lumaResourceAudience&&claims.client_id===config.lumaClientId;
    if(!own&&!luma)throw new Error("Le token Kyros ne vise pas une application autorisée.");
    const scopes=new Set(String(claims.scope??"").split(/\s+/).filter(Boolean));const required=apiRequest?config.apiRequiredScopes:config.requiredScopes;
    const missing=required.find((scope)=>!scopes.has(scope));if(missing)throw new Error(`Scope Kyros manquant : ${missing}`);return claims;
  }
  async function requestTokens(body:Record<string,string>):Promise<KyrosTokenResponse>{
    const response=await fetch(`${config.baseUrl}/token`,{method:"POST",headers:{accept:"application/json","content-type":"application/json"},body:JSON.stringify({...body,kyros_sso_version:"v4",kyros_edition:"standard",kyros_application_scope:"standard"})});
    const payload=await response.json().catch(()=>null) as KyrosTokenResponse|{error?:string}|null;
    if(!response.ok||!payload||!("access_token" in payload)||!("refresh_token" in payload))throw new Error(`Kyros a refusé la requête : ${payload&&"error" in payload?payload.error:"kyros_request_failed"}`);return payload;
  }
  async function storeSession(request:FastifyRequest,tokens:KyrosTokenResponse,regenerate=false){
    const claims=await verifyAccessToken(tokens.access_token);const username=tokens.user?.username??claims.username??String(claims.sub);if(regenerate)await request.session.regenerate();
    request.session.user={id:String(claims.sub),username,displayName:tokens.user?.displayName??claims.display_name??username};request.session.kyros={accessToken:tokens.access_token,refreshToken:tokens.refresh_token,accessTokenExpiresAt:claims.exp!*1000};
  }
  async function refreshSessionIfNeeded(request:FastifyRequest){const{session}=request;if(!session.user||!session.kyros)return false;if(session.kyros.accessTokenExpiresAt>Date.now()+30_000)return true;try{const tokens=await requestTokens({grant_type:"refresh_token",client_id:config.clientId,client_secret:config.clientSecret,refresh_token:session.kyros.refreshToken});await storeSession(request,tokens);return true}catch{await session.destroy();return false}}
  async function requireSession(request:FastifyRequest,reply:FastifyReply){const authorization=request.headers.authorization;if(authorization?.startsWith("Bearer ")){try{const claims=await verifyAccessToken(authorization.slice(7).trim(),{apiRequest:true});const username=claims.username??String(claims.sub);request.currentUser={id:String(claims.sub),username,displayName:claims.display_name??username};return}catch{return reply.code(401).send({error:"Le jeton Kyros transmis à BrainDump est invalide."})}}
    const authenticated=await refreshSessionIfNeeded(request);if(!authenticated||!request.session.user)return reply.code(401).send({error:"Ta session a expiré. Reconnecte-toi pour continuer."});request.currentUser=request.session.user;}
  async function createParRequest(state:string,codeChallenge:string){const response=await fetch(`${config.baseUrl}/par`,{method:"POST",headers:{accept:"application/json","content-type":"application/json"},body:JSON.stringify({client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:`${config.appBaseUrl}/auth/callback`,scope:config.requestedScopes,state,code_challenge:codeChallenge,code_challenge_method:"S256",kyros_sso_version:"v4",kyros_edition:"standard",kyros_application_scope:"standard"})});const payload=await response.json().catch(()=>null) as {request_uri?:string;error?:string}|null;if(!response.ok||!payload?.request_uri)throw new Error(`Kyros a refusé la requête PAR : ${payload?.error??"par_failed"}`);return payload.request_uri}
  async function exchangeAuthorizationCode(request:FastifyRequest,code:string,codeVerifier:string){const tokens=await requestTokens({grant_type:"authorization_code",client_id:config.clientId,client_secret:config.clientSecret,code,code_verifier:codeVerifier,redirect_uri:`${config.appBaseUrl}/auth/callback`});await storeSession(request,tokens,true)}
  async function logout(request:FastifyRequest){const refreshToken=request.session.kyros?.refreshToken;if(refreshToken)await fetch(`${config.baseUrl}/revoke`,{method:"POST",headers:{accept:"application/json","content-type":"application/json"},body:JSON.stringify({client_id:config.clientId,client_secret:config.clientSecret,refresh_token:refreshToken,kyros_sso_version:"v4"})}).catch(()=>undefined);await request.session.destroy()}
  return{config,createParRequest,exchangeAuthorizationCode,logout,refreshSessionIfNeeded,requireSession};
}
export type AuthService=ReturnType<typeof createAuthService>;
