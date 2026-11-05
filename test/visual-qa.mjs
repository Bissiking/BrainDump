// Real Fastify routes and disposable SQLite; only the Kyros identity is synthetic.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import puppeteer from 'puppeteer-core';
import { publicRoot, viewsRoot } from '../src/web/paths.ts';

const temporary = await mkdtemp(join(tmpdir(),'braindump-v22-visual-'));
process.env.BRAINDUMP_DATABASE_PATH=join(temporary,'qa.db');
const db=await import('../src/database/database.ts');
const {registerApiRoutes}=await import('../src/api-routes.ts');
const {registerIntegrationRoutes}=await import('../src/integrations/routes.ts');
const app=Fastify();const port=Number(process.env.QA_PORT||4319),base=`http://127.0.0.1:${port}`;
const out=resolve('.impeccable/review/v2.2.0');await mkdir(out,{recursive:true});
const results={identity:'synthetic Kyros session',storage:'temporary SQLite',api:'real Fastify routes',viewports:[],flows:[],errors:[]};
let browser;
const iso=(offset,hour=10)=>{const date=new Date();date.setDate(date.getDate()+offset);date.setHours(hour,0,0,0);return date.toISOString()};
const project=db.createProject('qa',{name:'BrainDump'}),other=db.createProject('qa',{name:'Harmonix',color:'#5d83c8'});
const seeds=[
  {title:'Préparer le point hebdo avec l’équipe',content:'Lister les décisions et préparer les sujets prioritaires.',type:'task',status:'todo',priority:'high',dueAt:iso(0),projectId:other.id,tags:['réunion'],favorite:true},
  {title:'Draft du plan de contenu Q3',content:'Axes éditoriaux et premières idées de formats.',type:'note',status:'inbox',dueAt:iso(1,14),projectId:project.id,tags:['contenu']},
  {title:'Idée de mode focus sans distraction',content:'Masquer le chrome pendant une session courte.',type:'idea',projectId:project.id,tags:['ux']},
  {title:'Corriger l’erreur d’export CSV',content:'Les caractères accentués cassent l’export.',type:'bug',status:'in_progress',priority:'urgent',dueAt:iso(-1,17),projectId:project.id,tags:['export']},
  {title:'Appeler le dentiste',content:'Prendre le rendez-vous annuel.',type:'reminder',status:'todo',dueAt:iso(0,18)}
].map(input=>db.createDump('qa',input));
const auth={config:{appBaseUrl:base,issuer:'https://kyros.example'},requireSession:async request=>{request.currentUser={id:'qa',username:'matheo',displayName:'Mathéo'}},refreshSessionIfNeeded:async request=>{request.session.user={id:'qa',username:'matheo',displayName:'Mathéo'};return true}};
await app.register(cookie);await app.register(session,{secret:'visual-qa-synthetic-session-secret-32-characters',cookie:{secure:false}});
await app.register(fastifyStatic,{root:publicRoot,index:false});
await registerApiRoutes(app,auth);await registerIntegrationRoutes(app,auth,db.database);
app.get('/api/session',async()=>({authenticated:true,user:{id:'qa',username:'matheo',displayName:'Mathéo'}}));
app.get('/',async(_request,reply)=>reply.sendFile('index.html',viewsRoot));
app.get('/login',async(_request,reply)=>reply.sendFile('login.html',viewsRoot));
await app.listen({host:'127.0.0.1',port});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function pageAt(width,height,path='/',javascript=true) {
  const page=await browser.newPage();await page.setJavaScriptEnabled(javascript);await page.setViewport({width,height,deviceScaleFactor:1});await page.emulateTimezone('Europe/Paris');
  page.on('pageerror',error=>results.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')results.errors.push(message.text())});
  await page.goto(base+path,{waitUntil:'networkidle0'});return page;
}
async function capture(page,name) {await page.screenshot({path:join(out,`${name}.png`),fullPage:true});}
async function noOverflow(page,label) {
  const metrics=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.equal(metrics.overflow,false,`Débordement : ${label}`);const bounds=await page.$$eval('.workspace,.capture-plane,.content-plane',nodes=>nodes.filter(node=>node.getBoundingClientRect().width>0).map(node=>({className:node.className,right:node.getBoundingClientRect().right})));assert.ok(bounds.every(node=>node.right<=metrics.width+1),`Contenu coupé : ${label} ${JSON.stringify(bounds)}`);return metrics;
}
async function waitRows(page,count){await page.waitForFunction(n=>document.querySelectorAll('#dump-list .dump-row').length===n,{},count)}
async function clickAndWait(page,selector,method,path) {
  const pending=page.waitForResponse(response=>response.url().includes(path)&&response.request().method()===method);
  pending.catch(()=>{});await page.click(selector);const response=await pending;assert.ok(response.ok(),`${method} ${path} -> ${response.status()}`);return response.json();
}
try {
  const executablePath=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'].find(existsSync);
  assert.ok(executablePath,'Chrome absent : définir CHROME_PATH');
  browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox']});
  for(const item of process.env.VIEWPORTS?.split(',')||['1440x1000','1366x900','768x1024','390x844','375x667']) {
    const [width,height]=item.split('x').map(Number),page=await pageAt(width,height);
    await waitRows(page,5);const metrics=await noOverflow(page,item);
    const icons=await page.$$eval('svg.icon',nodes=>nodes.filter(node=>node.getBoundingClientRect().width>0).map(node=>({href:node.querySelector('use')?.getAttribute('href'),width:node.getBBox().width,height:node.getBBox().height})));
    assert.ok(icons.length>10);assert.ok(icons.every(item=>item.width>0&&item.height>0),'SVG externe vide');
    await capture(page,`home-${item}`);results.viewports.push({viewport:item,...metrics,visibleIcons:icons.length});await page.close();
  }
  const desktop=await pageAt(1440,1000);
  await desktop.type('#capture-content','Corriger l’erreur HTTP 500 API urgente sur BrainDump demain #recherche');
  await desktop.waitForSelector('#triage-preview:not([hidden])');
  assert.match(await desktop.$eval('#triage-preview',node=>node.textContent),/Bug proposée/);
  await desktop.click('#type-selector [data-type="idea"]');await desktop.click('#options-toggle');
  await desktop.select('#capture-project','none');await desktop.type('#capture-tags','travail, TRAVAIL, suivi');
  const created=await clickAndWait(desktop,'#save-dump','POST','/api/dumps');
  assert.equal(created.type,'idea');assert.ok(created.dueAt);assert.equal(created.projectId,null);assert.deepEqual(created.tags.map(tag=>tag.name),['suivi','travail']);
  await waitRows(desktop,6);results.flows.push('capture desktop, correction, déduplication des tags, échéance automatique et projet explicitement vide');
  await desktop.type('#filter-search','export');await waitRows(desktop,1);
  assert.match(desktop.url(),/search=export/);await desktop.reload({waitUntil:'networkidle0'});await waitRows(desktop,1);
  await desktop.click('#reset-filters');await waitRows(desktop,6);
  await desktop.type('#filter-search','aucun résultat xyz');await desktop.waitForSelector('.empty-state');assert.equal(await desktop.$eval('#filter-count',node=>node.textContent),'1 filtre actif');
  await desktop.click('#reset-filters');await waitRows(desktop,6);
  await desktop.click('#secondary-filters summary');await desktop.select('#filter-priority','urgent');await waitRows(desktop,2);await desktop.click('#reset-filters');await waitRows(desktop,6);
  results.flows.push('filtres en direct, filtres secondaires, état vide, réinitialisation et restauration URL');
  await desktop.click(`[data-id="${seeds[3].id}"] .row-menu summary`);
  await clickAndWait(desktop,`[data-archive="${seeds[3].id}"]`,'PATCH',`/api/dumps/${seeds[3].id}`);
  await waitRows(desktop,5);assert.ok(db.getDump('qa',seeds[3].id).archivedAt);
  await desktop.click('.toast:last-child button');await waitRows(desktop,6);assert.equal(db.getDump('qa',seeds[3].id).archivedAt,null);
  await clickAndWait(desktop,`[data-favorite="${seeds[1].id}"]`,'PATCH',`/api/dumps/${seeds[1].id}`);await desktop.waitForSelector(`[data-favorite="${seeds[1].id}"][aria-pressed="true"]`);
  await desktop.click('.toast:last-child button');await desktop.waitForSelector(`[data-favorite="${seeds[1].id}"][aria-pressed="false"]`);
  await clickAndWait(desktop,`[data-complete="${seeds[0].id}"]`,'PATCH',`/api/dumps/${seeds[0].id}`);await desktop.waitForSelector(`[data-complete="${seeds[0].id}"].done`);
  await desktop.click('.toast:last-child button');await desktop.waitForSelector(`[data-complete="${seeds[0].id}"]:not(.done)`);
  results.flows.push('actions rapides terminer, favori, archiver et annulations persistées');
  // Delay one write, change notes while it runs, and verify neither payload crosses IDs.
  await desktop.setRequestInterception(true);let delayed=false;
  desktop.on('request',async request=>{if(request.method()==='PATCH'&&!delayed&&request.url().includes(`/api/dumps/${seeds[1].id}`)){delayed=true;await pause(700)}await request.continue()});
  await desktop.click(`[data-open="${seeds[1].id}"]`);await desktop.waitForSelector('#detail-form:not([hidden])');
  const originalDue=db.getDump('qa',seeds[1].id).dueAt;
  const local=await desktop.$eval('#detail-due',node=>node.value);
  const expected=await desktop.evaluate(value=>{const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)},originalDue);assert.equal(local,expected);
  await desktop.$eval('#detail-title',node=>{node.value='Titre sauvegardé sur la bonne pensée';node.dispatchEvent(new Event('input',{bubbles:true}))});
  await pause(600);await desktop.click(`[data-open="${seeds[2].id}"]`);await desktop.waitForFunction(()=>document.querySelector('#detail-title').value==='Idée de mode focus sans distraction');
  assert.equal(db.getDump('qa',seeds[1].id).title,'Titre sauvegardé sur la bonne pensée');assert.equal(db.getDump('qa',seeds[2].id).title,seeds[2].title);assert.equal(db.getDump('qa',seeds[1].id).dueAt,originalDue);
  await desktop.click('#close-detail');await desktop.waitForSelector('#detail-form[hidden]');results.flows.push('autosauvegarde retardée, changement de pensée, IDs isolés et heure locale sans déplacement de l’échéance');
  await desktop.click('[data-view="settings"]');await desktop.waitForSelector('#learning-enabled');
  await clickAndWait(desktop,'#learning-enabled','PATCH','/api/preferences/triage');assert.equal((await fetch(base+'/api/preferences/triage').then(response=>response.json())).enabled,true);
  await capture(desktop,'settings-desktop');desktop.on('dialog',dialog=>dialog.accept());await desktop.click('#reset-learning');await desktop.waitForSelector('#learning-enabled:not(:checked)');await desktop.waitForSelector('#reset-learning:not(:disabled)');
  await desktop.click('a[href="/integrations"]');await desktop.waitForSelector('#client-form');assert.match(await desktop.title(),/Applications connectées/);await noOverflow(desktop,'integrations-desktop');await desktop.close();
  results.flows.push('Paramètres, activation et réinitialisation du triage, accès aux applications connectées');
  for(const [width,height] of [[390,844],[375,667]]) {
    const page=await pageAt(width,height);await page.click('#mobile-add');await page.waitForSelector('#mobile-capture[open]');
    await page.type('#mobile-content','Préparer la réunion BrainDump demain #mobile');await page.waitForSelector('#mobile-triage-preview:not([hidden])');
    await page.click('#mobile-types [data-type="note"]');await page.click('.mobile-options summary');await page.select('#mobile-project',String(other.id));
    await page.type('#mobile-tags','mobile, test');await page.$eval('#mobile-reference',node=>{node.value='2020-04-01T12:30';node.dispatchEvent(new Event('input',{bubbles:true}))});
    await page.click('#mobile-no-due');await page.$eval('#mobile-save',node=>node.scrollIntoView({block:'nearest'}));
    await capture(page,`capture-${width}x${height}`);await noOverflow(page,`capture-${width}`);
    const sheet=await page.$eval('#mobile-capture',node=>{const rect=node.getBoundingClientRect();return {top:rect.top,bottom:rect.bottom,viewport:innerHeight}});assert.ok(sheet.top>=0&&sheet.bottom<=sheet.viewport+1);
    const saved=await clickAndWait(page,'#mobile-save','POST','/api/dumps');assert.equal(saved.type,'note');assert.equal(saved.projectId,other.id);assert.equal(saved.dueAt,null);assert.ok(saved.referenceAt);assert.deepEqual(saved.tags.map(tag=>tag.name),['mobile','test']);
    await page.waitForSelector('#mobile-capture:not([open])');await page.waitForFunction(()=>!document.querySelector('#mobile-save').disabled);await page.click('.mobile-nav [data-view="more"]');await page.waitForSelector('.more-grid');await page.click('.more-grid [data-view="settings"]');await page.waitForSelector('#learning-enabled');await capture(page,`settings-${width}x${height}`);await noOverflow(page,`settings-${width}`);
    results.flows.push(`capture mobile complète et Paramètres ${width} × ${height}`);await page.close();
  }
  for(const [width,height] of [[1440,1000],[390,844],[375,667]]) {
    const page=await pageAt(width,height,'/login',false);await capture(page,`login-${width}x${height}`);await noOverflow(page,`login-${width}`);assert.equal(await page.$eval('#login-button',node=>node.getAttribute('href')),'/auth/login');await page.close();
  }
  assert.deepEqual(results.errors,[],'Erreurs console/navigateur');results.passed=true;
} catch(error) {results.passed=false;results.failure=error.stack;for(const page of await browser?.pages()||[]){if(!page.isClosed()){await capture(page,'failure').catch(()=>{});results.debug=await page.evaluate(()=>({url:location.href,title:document.querySelector('h1')?.textContent,openDialogs:[...document.querySelectorAll('dialog[open]')].map(node=>node.id)})).catch(()=>null);}}throw error;}
finally {
  await writeFile(join(out,'report.json'),JSON.stringify(results,null,2)+'\n');
  await browser?.close();await app.close();db.database.close();await rm(temporary,{recursive:true,force:true});console.log(JSON.stringify(results,null,2));
}
