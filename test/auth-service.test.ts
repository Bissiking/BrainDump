// test/auth-service.test.ts
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import jwt from "jsonwebtoken";
import { createAuthService } from "../src/auth/auth-service.js";
import { loadAuthConfig, type AuthConfig } from "../src/auth/auth-config.js";

const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});const jwk=publicKey.export({format:"jwk"});Object.assign(jwk,{kid:"test-key",use:"sig",alg:"RS256"});
const config:AuthConfig={appBaseUrl:"https://braindump.test",baseUrl:"https://kyros.test",clientId:"cli_braindump",clientSecret:"secret",issuer:"https://kyros.test",audience:"kyros-modules",resourceAudience:"kyros:sso:braindump",requestedScopes:"profile email braindump:access",requiredScopes:["profile","email","braindump:access"],apiRequiredScopes:["braindump:access"],jwksUrl:"https://kyros.test/sso/v4/jwks",lumaClientId:"cli_luma_os",lumaResourceAudience:"kyros:sso:luma-os"};
const originalFetch=globalThis.fetch;globalThis.fetch=async(url)=>{if(String(url)===config.jwksUrl)return new Response(JSON.stringify({keys:[jwk]}),{status:200,headers:{"content-type":"application/json"}});throw new Error(`URL inattendue: ${url}`)};
function token(overrides:Record<string,unknown>={}){return jwt.sign({sub:"kyros-user-1",username:"matheo",display_name:"Mathéo",resource_aud:"kyros:sso:luma-os",client_id:"cli_luma_os",scope:"profile email braindump:access",nbf:Math.floor(Date.now()/1000)-1,jti:"token-1",...overrides},privateKey,{algorithm:"RS256",keyid:"test-key",issuer:config.issuer,audience:config.audience,expiresIn:"5m"})}
function replyRecorder(){return{status:200,payload:null as unknown,code(status:number){this.status=status;return this},send(payload:unknown){this.payload=payload;return this}}}
test.after(()=>{globalThis.fetch=originalFetch});
test("demande les scopes requis lorsque KYROS_REQUESTED_SCOPES est absent",()=>{
  const names=["KYROS_BASE_URL","KYROS_CLIENT_ID","KYROS_CLIENT_SECRET","KYROS_RESOURCE_AUDIENCE","KYROS_REQUESTED_SCOPES","KYROS_REQUIRED_SCOPES"] as const;
  const previous=Object.fromEntries(names.map((name)=>[name,process.env[name]]));
  Object.assign(process.env,{KYROS_BASE_URL:"https://kyros.test",KYROS_CLIENT_ID:"client",KYROS_CLIENT_SECRET:"secret",KYROS_RESOURCE_AUDIENCE:"resource",KYROS_REQUIRED_SCOPES:"openid profile email offline_access"});delete process.env.KYROS_REQUESTED_SCOPES;
  try{assert.equal(loadAuthConfig(3005).requestedScopes,"openid profile email offline_access")}finally{for(const name of names){const value=previous[name];if(value===undefined)delete process.env[name];else process.env[name]=value}}
});
test("accepte un bearer Kyros V4 RS256 autorisé et expose son sujet",async()=>{const auth=createAuthService(config);const request={headers:{authorization:`Bearer ${token()}`},session:{}} as any;const reply=replyRecorder();await auth.requireSession(request,reply as any);assert.equal(reply.status,200);assert.deepEqual(request.currentUser,{id:"kyros-user-1",username:"matheo",displayName:"Mathéo"})});
test("refuse un bearer V4 sans scope BrainDump",async()=>{const auth=createAuthService(config);const request={headers:{authorization:`Bearer ${token({scope:"profile email",jti:"token-2"})}`},session:{}} as any;const reply=replyRecorder();await auth.requireSession(request,reply as any);assert.equal(reply.status,401);assert.equal(request.currentUser,undefined)});
test("refuse une signature RS256 dont le kid n'est pas publié",async()=>{const auth=createAuthService(config);const bad=jwt.sign({sub:"x",resource_aud:config.resourceAudience,client_id:config.clientId,scope:config.requestedScopes,nbf:Math.floor(Date.now()/1000)-1,jti:"bad"},privateKey,{algorithm:"RS256",keyid:"unknown",issuer:config.issuer,audience:config.audience,expiresIn:"5m"});const request={headers:{authorization:`Bearer ${bad}`},session:{}} as any;const reply=replyRecorder();await auth.requireSession(request,reply as any);assert.equal(reply.status,401)});
