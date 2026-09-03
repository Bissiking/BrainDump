// test/api-routes.test.ts
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Fastify from "fastify";

process.env.BRAINDUMP_DATABASE_PATH=join(mkdtempSync(join(tmpdir(),"braindump-api-test-")),"api.db");
const {registerApiRoutes}=await import("../src/api-routes.js");
const app=Fastify();
const auth={requireSession:async(request:any)=>{request.currentUser={id:String(request.headers["x-user"]??"user-a"),username:"test",displayName:"Test"};}} as any;
await registerApiRoutes(app,auth);

test.after(async()=>app.close());
test("enchaîne projets, création, édition, recherche et suppression d'un Dump",async()=>{
  const projectResponse=await app.inject({method:"POST",url:"/api/projects",headers:{"x-user":"user-a"},payload:{name:"BrainDump",color:"#e7653b"}});assert.equal(projectResponse.statusCode,201);const project=projectResponse.json();
  const createResponse=await app.inject({method:"POST",url:"/api/dumps",headers:{"x-user":"user-a"},payload:{content:"Corriger le bug de recherche demain",type:"bug",projectId:project.id,tags:["api","recherche"]}});assert.equal(createResponse.statusCode,201);const dump=createResponse.json();assert.equal(dump.userId,"user-a");assert.equal(dump.project.name,"BrainDump");
  const inbox=await app.inject({method:"GET",url:"/api/dumps?status=inbox",headers:{"x-user":"user-a"}});assert.equal(inbox.statusCode,200);assert.equal(inbox.json().some((item:any)=>item.id===dump.id),true);
  const tags=await app.inject({method:"GET",url:"/api/tags",headers:{"x-user":"user-a"}});assert.equal(tags.statusCode,200);assert.equal(tags.json().some((tag:any)=>tag.name==="recherche"),true);
  const attachment=await app.inject({method:"POST",url:`/api/dumps/${dump.id}/attachments`,headers:{"x-user":"user-a"},payload:{name:"Spécification",url:"https://example.test/spec.pdf",mimeType:"application/pdf"}});assert.equal(attachment.statusCode,200);assert.equal(attachment.json().attachments.length,1);
  const todayDueAt=new Date();todayDueAt.setHours(12,0,0,0);await app.inject({method:"PATCH",url:`/api/dumps/${dump.id}`,headers:{"x-user":"user-a"},payload:{dueAt:todayDueAt.toISOString(),status:"todo"}});
  const today=await app.inject({method:"GET",url:"/api/today",headers:{"x-user":"user-a"}});assert.equal(today.statusCode,200);assert.equal(today.json().today.some((item:any)=>item.id===dump.id),true);
  const foreign=await app.inject({method:"GET",url:`/api/dumps/${dump.id}`,headers:{"x-user":"user-b"}});assert.equal(foreign.statusCode,404);
  const update=await app.inject({method:"PATCH",url:`/api/dumps/${dump.id}`,headers:{"x-user":"user-a"},payload:{status:"done",favorite:true}});assert.equal(update.statusCode,200);assert.equal(update.json().completedAt!=null,true);
  const search=await app.inject({method:"GET",url:"/api/dumps?search=recherche",headers:{"x-user":"user-a"}});assert.equal(search.statusCode,200);assert.equal(search.json().length,1);
  const remove=await app.inject({method:"DELETE",url:`/api/dumps/${dump.id}`,headers:{"x-user":"user-a"}});assert.equal(remove.statusCode,204);
});

test("refuse un projectId appartenant à un autre utilisateur",async()=>{
  const project=(await app.inject({method:"POST",url:"/api/projects",headers:{"x-user":"user-b"},payload:{name:"Privé"}})).json();
  const response=await app.inject({method:"POST",url:"/api/dumps",headers:{"x-user":"user-a"},payload:{content:"Tentative",projectId:project.id}});assert.equal(response.statusCode,400);assert.equal(response.json().error,"Projet invalide.");
});
