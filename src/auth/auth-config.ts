// src/auth/auth-config.ts
export interface AuthConfig {
  appBaseUrl:string; baseUrl:string; clientId:string; clientSecret:string; issuer:string; audience:string; resourceAudience:string;
  requestedScopes:string; requiredScopes:string[]; apiRequiredScopes:string[]; jwksUrl:string; lumaClientId:string|null; lumaResourceAudience:string|null;
}
const requiredVariables=["KYROS_BASE_URL","KYROS_CLIENT_ID","KYROS_CLIENT_SECRET","KYROS_RESOURCE_AUDIENCE"] as const;
export function loadAuthConfig(port:number):AuthConfig{
  for(const name of requiredVariables)if(!process.env[name])throw new Error(`Variable d'environnement absente : ${name}`);
  const baseUrl=process.env.KYROS_BASE_URL!.replace(/\/$/,"");
  const requestedScopes=process.env.KYROS_REQUESTED_SCOPES??process.env.KYROS_REQUIRED_SCOPES??"profile email braindump:access";
  return{appBaseUrl:process.env.APP_BASE_URL??`http://localhost:${port}`,baseUrl,clientId:process.env.KYROS_CLIENT_ID!,clientSecret:process.env.KYROS_CLIENT_SECRET!,
    issuer:process.env.KYROS_ISSUER??baseUrl,audience:process.env.KYROS_AUDIENCE??"kyros-modules",resourceAudience:process.env.KYROS_RESOURCE_AUDIENCE!,jwksUrl:process.env.KYROS_JWKS_URL??`${baseUrl}/sso/v4/jwks`,
    requestedScopes,requiredScopes:(process.env.KYROS_REQUIRED_SCOPES??requestedScopes).split(/\s+/).filter(Boolean),apiRequiredScopes:(process.env.KYROS_API_REQUIRED_SCOPES??"braindump:access").split(/\s+/).filter(Boolean),
    lumaClientId:process.env.KYROS_LUMA_CLIENT_ID??null,lumaResourceAudience:process.env.KYROS_LUMA_RESOURCE_AUDIENCE??null};
}
