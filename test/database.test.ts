// test/database.test.ts
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";

const directory=mkdtempSync(join(tmpdir(),"braindump-v2-test-"));const databasePath=join(directory,"braindump.db");
const legacy=new Database(databasePath);legacy.exec(`CREATE TABLE notes(id INTEGER PRIMARY KEY AUTOINCREMENT,owner_id TEXT,content TEXT NOT NULL,type TEXT NOT NULL,priority TEXT NOT NULL,project TEXT,due_date TEXT,tags TEXT NOT NULL DEFAULT '[]',confidence INTEGER NOT NULL,scores TEXT NOT NULL DEFAULT '{}',status TEXT NOT NULL DEFAULT 'new',created_at TEXT NOT NULL);
INSERT INTO notes(owner_id,content,type,priority,project,tags,confidence,scores,status,created_at) VALUES('user-a','Note historique','information','normal','BrainDump','["legacy"]',35,'{}','new','2026-01-01T00:00:00.000Z');
INSERT INTO notes(content,type,priority,tags,confidence,scores,status,created_at) VALUES('Sans propriétaire','information','normal','[]',35,'{}','new','2026-01-01T00:00:00.000Z');`);legacy.close();
process.env.BRAINDUMP_DATABASE_PATH=databasePath;
const database=await import("../src/database/database.js");

test("migre les notes attribuées vers le modèle Dump sans exposer les orphelines",()=>{const dumps=database.listDumps("user-a");assert.equal(dumps.length,1);assert.equal(dumps[0].type,"note");assert.equal(dumps[0].project?.name,"BrainDump");assert.deepEqual(dumps[0].tags.map((tag)=>tag.name),["legacy"]);assert.deepEqual(database.listDumps("user-b"),[])});

test("isole le CRUD, les projets et les tags par utilisateur",()=>{const project=database.createProject("user-a",{name:"Harmonix",color:"#5577aa"});const dump=database.createDump("user-a",{title:"Préparer la sortie",content:"Tester le build",type:"task",status:"todo",priority:"high",projectId:project.id,tags:["release","mobile"]});assert.equal(database.getDump("user-b",dump.id),null);assert.equal(database.updateDump("user-b",dump.id,{title:"Intrusion"}),null);assert.equal(database.deleteDump("user-b",dump.id),false);assert.equal(database.getDump("user-a",dump.id)?.project?.name,"Harmonix");assert.deepEqual(database.getDump("user-a",dump.id)?.tags.map((tag)=>tag.name),["mobile","release"]);assert.equal(database.updateDump("user-a",dump.id,{status:"done"})?.completedAt!=null,true)});

test("recherche dans le contenu, le projet et les tags",()=>{assert.equal(database.listDumps("user-a",{search:"Harmonix"}).some((dump)=>dump.title==="Préparer la sortie"),true);assert.equal(database.listDumps("user-a",{search:"mobile"}).some((dump)=>dump.title==="Préparer la sortie"),true);assert.equal(database.listDumps("user-b",{search:"mobile"}).length,0)});
