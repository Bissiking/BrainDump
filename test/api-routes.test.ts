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
  const update=await app.inject({method:"PATCH",url:`/api/dumps/${dump.id}`,headers:{"x-user":"user-a"},payload:{status:"done",favorite:true}});assert.equal(update.statusCode,200);assert.equal(update.json().completedAt!=null,true);assert.equal(update.json().content,"Corriger le bug de recherche demain");assert.equal(update.json().title,null);
  const search=await app.inject({method:"GET",url:"/api/dumps?search=recherche",headers:{"x-user":"user-a"}});assert.equal(search.statusCode,200);assert.equal(search.json().length,1);
  const remove=await app.inject({method:"DELETE",url:`/api/dumps/${dump.id}`,headers:{"x-user":"user-a"}});assert.equal(remove.statusCode,204);
});

test("refuse un projectId appartenant à un autre utilisateur",async()=>{
  const project=(await app.inject({method:"POST",url:"/api/projects",headers:{"x-user":"user-b"},payload:{name:"Privé"}})).json();
  const response=await app.inject({method:"POST",url:"/api/dumps",headers:{"x-user":"user-a"},payload:{content:"Tentative",projectId:project.id}});assert.equal(response.statusCode,400);assert.equal(response.json().error,"Projet invalide.");
});

test("le triage utilise les projets réels de l'utilisateur",async()=>{
  const project=(await app.inject({method:"POST",url:"/api/projects",headers:{"x-user":"user-c"},payload:{name:"Atelier Mars"}})).json();
  const analyze=await app.inject({method:"POST",url:"/api/analyze",headers:{"x-user":"user-c"},payload:{content:"Préparer la réunion Atelier Mars demain"}});assert.equal(analyze.statusCode,200);assert.equal(analyze.json().project,"Atelier Mars");assert.equal(analyze.json().type,"task");assert.equal(Array.isArray(analyze.json().signals),true);
  const afterAnalyze=await app.inject({method:"GET",url:"/api/dumps",headers:{"x-user":"user-c"}});assert.equal(afterAnalyze.statusCode,200);assert.equal(afterAnalyze.json().length,0);
  const create=await app.inject({method:"POST",url:"/api/dumps",headers:{"x-user":"user-c"},payload:{content:"Préparer la réunion Atelier Mars demain"}});assert.equal(create.statusCode,201);assert.equal(create.json().projectId,project.id);assert.equal(create.json().type,"task");assert.equal(create.json().dueAt!==null,true);
});

test('triage prudent, échéance conservée, champs explicites prioritaires et projets actifs seulement',async()=>{
  const headers={'x-user':'smart-user'};
  const analyze=(content:string)=>app.inject({method:'POST',url:'/api/analyze',headers,payload:{content}});
  const unknown=(await analyze('Une pensée sans marqueur particulier')).json();
  assert.equal(unknown.suggestedType,null);assert.ok(unknown.explanation.includes('Pas assez'));
  const neutral=(await app.inject({method:'POST',url:'/api/dumps',headers,payload:{content:'Une pensée sans marqueur particulier'}})).json();assert.equal(neutral.type,'note');
  const automatic=(await app.inject({method:'POST',url:'/api/dumps',headers,payload:{content:'Préparer les plans demain #maison'}})).json();assert.equal(automatic.type,'task');assert.ok(automatic.dueAt);assert.equal(automatic.tags.some((tag:any)=>tag.name==='maison'),true);
  const explicit=(await app.inject({method:'POST',url:'/api/dumps',headers,payload:{content:'Préparer les plans demain #maison',type:'idea',dueAt:null,projectId:null,tags:[],referenceAt:'2020-04-01T10:00:00.000Z'}})).json();assert.equal(explicit.type,'idea');assert.equal(explicit.dueAt,null);assert.equal(explicit.referenceAt,'2020-04-01T10:00:00.000Z');assert.deepEqual(explicit.tags,[]);
  assert.equal((await analyze('Tester Kyros demain')).json().project,null);
  await app.inject({method:'POST',url:'/api/projects',headers,payload:{name:'ABC'}});
  assert.equal((await analyze('Préparer BrainDump pour ABC demain')).json().project,'ABC');
  const project=(await app.inject({method:'POST',url:'/api/projects',headers,payload:{name:'Atelier fermé'}})).json();
  await app.inject({method:'PATCH',url:`/api/projects/${project.id}`,headers,payload:{status:'archived'}});
  assert.equal((await analyze('Préparer Atelier fermé demain')).json().project,null);
});

test('apprentissage facultatif, répété, isolé, désactivable et réinitialisable sans reclassement',async()=>{
  const headers={'x-user':'learner'};
  const preferences=()=>app.inject({url:'/api/preferences/triage',headers});
  const create=(content:string)=>app.inject({method:'POST',url:'/api/dumps',headers,payload:{content,type:'idea'}});
  const analyze=(content:string,owner='learner')=>app.inject({method:'POST',url:'/api/analyze',headers:{'x-user':owner},payload:{content}});
  assert.deepEqual((await preferences()).json(),{enabled:false,patterns:0});
  await create('Collecter cailloux roses');assert.equal((await preferences()).json().patterns,0);
  await app.inject({method:'PATCH',url:'/api/preferences/triage',headers,payload:{enabled:true}});
  const first=(await create('Collecter cailloux bleus')).json();
  assert.equal((await analyze('Collecter cailloux verts')).json().learned,false);
  await create('Collecter cailloux blancs');
  const learned=(await analyze('Collecter cailloux verts')).json();assert.equal(learned.suggestedType,'idea');assert.equal(learned.learned,true);
  assert.equal((await analyze('Collecter cailloux verts','other-learner')).json().learned,false);
  assert.equal((await analyze('Tâche: Collecter cailloux verts')).json().suggestedType,'task');
  await app.inject({method:'PATCH',url:'/api/preferences/triage',headers,payload:{enabled:false}});
  assert.equal((await analyze('Collecter cailloux verts')).json().learned,false);assert.equal((await preferences()).json().patterns,1);
  await app.inject({method:'DELETE',url:'/api/preferences/triage',headers:{'x-user':'other-learner'}});assert.equal((await preferences()).json().patterns,1);
  await app.inject({method:'DELETE',url:'/api/preferences/triage',headers});assert.deepEqual((await preferences()).json(),{enabled:false,patterns:0});
  assert.equal((await app.inject({url:`/api/dumps/${first.id}`,headers})).json().type,'idea');
});

test('filtres de priorité et dates, archives séparées et validation des bornes',async()=>{
  const headers={'x-user':'filter-user'},date='2026-11-05T12:00:00.000Z';
  const dump=(await app.inject({method:'POST',url:'/api/dumps',headers,payload:{content:'Document daté',type:'note',status:'todo',priority:'high',referenceAt:date,dueAt:null,tags:['Maison','maison',' MAISON ']}})).json();
  assert.equal(dump.tags.length,1);
  const query='/api/dumps?priority=high&dateField=referenceAt&from=2026-11-05T00:00:00.000Z&to=2026-11-05T23:59:59.999Z';
  assert.deepEqual((await app.inject({url:query,headers})).json().map((item:any)=>item.id),[dump.id]);
  assert.deepEqual((await app.inject({url:query,headers:{'x-user':'outsider'}})).json(),[]);
  assert.deepEqual((await app.inject({url:query.replace('referenceAt','dueAt'),headers})).json(),[]);
  await app.inject({method:'PATCH',url:`/api/dumps/${dump.id}`,headers,payload:{archivedAt:date}});
  assert.deepEqual((await app.inject({url:'/api/dumps?status=todo',headers})).json(),[]);
  assert.equal((await app.inject({url:'/api/dumps?status=archived',headers})).json().length,1);
  await app.inject({method:'PATCH',url:`/api/dumps/${dump.id}`,headers,payload:{archivedAt:null}});
  assert.equal((await app.inject({url:query,headers})).json().length,1);
  assert.equal((await app.inject({url:'/api/dumps?from=2026-12-01T00:00:00Z&to=2026-01-01T00:00:00Z',headers})).statusCode,400);
  assert.equal((await app.inject({method:'PATCH',url:`/api/dumps/${dump.id}`,headers,payload:{referenceAt:'pas une date'}})).statusCode,400);
  assert.equal((await app.inject({method:'PATCH',url:`/api/dumps/${dump.id}`,headers:{'x-user':'outsider'},payload:{referenceAt:date}})).statusCode,404);
});

test('les préférences et corrections exigent une session, y compris sous le préfixe historique',async()=>{
  const guarded=Fastify();
  await registerApiRoutes(guarded,{requireSession:async(_request:any,reply:any)=>reply.code(401).send({error:'Session requise.'})} as any);
  try{for(const prefix of ['/api','/api/braindump'])for(const method of ['GET','PATCH','DELETE'] as const){const response=await guarded.inject({method,url:`${prefix}/preferences/triage`,...(method==='PATCH'?{payload:{enabled:true}}:{})});assert.equal(response.statusCode,401)}}finally{await guarded.close()}
});
