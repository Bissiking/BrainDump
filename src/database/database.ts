// src/database/database.ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { AttachmentRecord, DumpFilters, DumpRecord, DumpStatus, DumpType, Priority, ProjectRecord, TagRecord } from "../types.js";

const databasePath = process.env.BRAINDUMP_DATABASE_PATH ? resolve(process.env.BRAINDUMP_DATABASE_PATH) : resolve("data/braindump.db");
mkdirSync(dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, name TEXT NOT NULL COLLATE NOCASE, description TEXT,
    color TEXT NOT NULL DEFAULT '#e7653b', icon TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(user_id,name)
  );
  CREATE TABLE IF NOT EXISTS dumps (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, title TEXT, content TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'note' CHECK(type IN ('note','task','idea','bug','reminder')),
    status TEXT NOT NULL DEFAULT 'inbox' CHECK(status IN ('inbox','todo','in_progress','done','cancelled')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')), due_at TEXT,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, favorite INTEGER NOT NULL DEFAULT 0,
    parent_id INTEGER REFERENCES dumps(id) ON DELETE SET NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    archived_at TEXT, completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, name TEXT NOT NULL COLLATE NOCASE,
    color TEXT NOT NULL DEFAULT '#72819a', created_at TEXT NOT NULL, UNIQUE(user_id,name)
  );
  CREATE TABLE IF NOT EXISTS dump_tags (
    dump_id INTEGER NOT NULL REFERENCES dumps(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY(dump_id,tag_id)
  );
  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, dump_id INTEGER NOT NULL REFERENCES dumps(id) ON DELETE CASCADE, user_id TEXT NOT NULL,
    name TEXT NOT NULL, url TEXT NOT NULL, mime_type TEXT, size INTEGER, created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_dumps_user_updated ON dumps(user_id,updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_dumps_user_due ON dumps(user_id,due_at);
  CREATE INDEX IF NOT EXISTS idx_dumps_user_type ON dumps(user_id,type);
`);

function hasMigration(version:number) { return Boolean(db.prepare("SELECT 1 FROM schema_migrations WHERE version=?").get(version)); }
function tableExists(name:string) { return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name)); }

function setDumpTags(userId:string,dumpId:number,names:string[]) {
  db.prepare("DELETE FROM dump_tags WHERE dump_id=?").run(dumpId);
  const now=new Date().toISOString();
  for (const name of [...new Set(names.map((value)=>value.trim().toLowerCase()).filter(Boolean))].slice(0,12)) {
    db.prepare("INSERT OR IGNORE INTO tags(user_id,name,created_at) VALUES(?,?,?)").run(userId,name,now);
    const tag=db.prepare("SELECT id FROM tags WHERE user_id=? AND name=?").get(userId,name) as {id:number};
    db.prepare("INSERT OR IGNORE INTO dump_tags(dump_id,tag_id) VALUES(?,?)").run(dumpId,tag.id);
  }
}

const migrateLegacyNotes=db.transaction(()=>{
  if(hasMigration(2)||!tableExists("notes"))return;
  const columns=db.prepare("PRAGMA table_info(notes)").all() as Array<{name:string}>;
  if(!columns.some((column)=>column.name==="owner_id"))db.exec("ALTER TABLE notes ADD COLUMN owner_id TEXT");
  const rows=db.prepare("SELECT * FROM notes WHERE owner_id IS NOT NULL AND owner_id<>'' ORDER BY id").all() as Record<string,unknown>[];
  const now=new Date().toISOString();
  for(const note of rows){
    const userId=String(note.owner_id); let projectId:number|null=null;
    if(note.project){
      db.prepare("INSERT OR IGNORE INTO projects(user_id,name,created_at,updated_at) VALUES(?,?,?,?)").run(userId,String(note.project),now,now);
      projectId=Number((db.prepare("SELECT id FROM projects WHERE user_id=? AND name=?").get(userId,String(note.project)) as {id:number}).id);
    }
    const type=note.type==="information"?"note":String(note.type);
    const status=note.status==="done"?"done":note.status==="in_progress"?"in_progress":"inbox";
    const result=db.prepare(`INSERT INTO dumps(user_id,content,type,status,priority,due_at,project_id,created_at,updated_at,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .run(userId,String(note.content),type,status,String(note.priority),note.due_date??null,projectId,String(note.created_at),now,status==="done"?now:null);
    setDumpTags(userId,Number(result.lastInsertRowid),JSON.parse(String(note.tags??"[]")) as string[]);
  }
  db.prepare("INSERT INTO schema_migrations(version,applied_at) VALUES(2,?)").run(now);
});
migrateLegacyNotes();

function mapTag(row:Record<string,unknown>):TagRecord{return{id:Number(row.id),name:String(row.name),color:String(row.color),dumpCount:Number(row.dump_count??0),createdAt:String(row.created_at)}}
function tagsFor(userId:string,dumpId:number){return(db.prepare(`SELECT t.*,0 dump_count FROM tags t JOIN dump_tags dt ON dt.tag_id=t.id WHERE dt.dump_id=? AND t.user_id=? ORDER BY t.name`).all(dumpId,userId) as Record<string,unknown>[]).map(mapTag)}
function attachmentsFor(userId:string,dumpId:number):AttachmentRecord[]{return(db.prepare("SELECT * FROM attachments WHERE dump_id=? AND user_id=? ORDER BY id").all(dumpId,userId) as Record<string,unknown>[]).map((row)=>({id:Number(row.id),name:String(row.name),url:String(row.url),mimeType:row.mime_type?String(row.mime_type):null,size:row.size==null?null:Number(row.size),createdAt:String(row.created_at)}))}
function baseDumpQuery(){return`SELECT d.*,p.name project_name,p.color project_color,p.icon project_icon FROM dumps d LEFT JOIN projects p ON p.id=d.project_id AND p.user_id=d.user_id`}
function mapDump(userId:string,row:Record<string,unknown>):DumpRecord{return{
  id:Number(row.id),userId,title:row.title?String(row.title):null,content:String(row.content),type:row.type as DumpType,status:row.status as DumpStatus,priority:row.priority as Priority,
  dueAt:row.due_at?String(row.due_at):null,projectId:row.project_id?Number(row.project_id):null,
  project:row.project_id?{id:Number(row.project_id),name:String(row.project_name),color:String(row.project_color),icon:row.project_icon?String(row.project_icon):null}:null,
  tags:tagsFor(userId,Number(row.id)),attachments:attachmentsFor(userId,Number(row.id)),favorite:Boolean(row.favorite),parentId:row.parent_id?Number(row.parent_id):null,
  createdAt:String(row.created_at),updatedAt:String(row.updated_at),archivedAt:row.archived_at?String(row.archived_at):null,completedAt:row.completed_at?String(row.completed_at):null
}}

export function createDump(userId:string,input:{title?:string|null;content:string;type:DumpType;status?:DumpStatus;priority?:Priority;dueAt?:string|null;projectId?:number|null;tags?:string[];favorite?:boolean;parentId?:number|null}){
  const now=new Date().toISOString(); const result=db.prepare(`INSERT INTO dumps(user_id,title,content,type,status,priority,due_at,project_id,favorite,parent_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(userId,input.title||null,input.content,input.type,input.status??"inbox",input.priority??"normal",input.dueAt??null,input.projectId??null,input.favorite?1:0,input.parentId??null,now,now);
  setDumpTags(userId,Number(result.lastInsertRowid),input.tags??[]); return getDump(userId,Number(result.lastInsertRowid))!;
}
export function getDump(userId:string,id:number){const row=db.prepare(`${baseDumpQuery()} WHERE d.user_id=? AND d.id=?`).get(userId,id) as Record<string,unknown>|undefined;return row?mapDump(userId,row):null}
export function listDumps(userId:string,filters:DumpFilters={}){
  const where=["d.user_id=?"];const params:unknown[]=[userId];
  if(filters.type){where.push("d.type=?");params.push(filters.type)}
  if(filters.status==="archived")where.push("d.archived_at IS NOT NULL");else if(filters.status==="active")where.push("d.archived_at IS NULL AND d.status NOT IN ('done','cancelled')");else if(filters.status){where.push("d.status=?");params.push(filters.status)}else where.push("d.archived_at IS NULL");
  if(filters.projectId){where.push("d.project_id=?");params.push(filters.projectId)}
  if(filters.favorite!=null){where.push("d.favorite=?");params.push(filters.favorite?1:0)}
  if(filters.tag){where.push("EXISTS(SELECT 1 FROM dump_tags dt JOIN tags t ON t.id=dt.tag_id WHERE dt.dump_id=d.id AND t.user_id=d.user_id AND t.name=?)");params.push(filters.tag.toLowerCase())}
  if(filters.search){where.push("(d.title LIKE ? OR d.content LIKE ? OR p.name LIKE ? OR EXISTS(SELECT 1 FROM dump_tags sd JOIN tags st ON st.id=sd.tag_id WHERE sd.dump_id=d.id AND st.name LIKE ?))");const q=`%${filters.search}%`;params.push(q,q,q,q)}
  params.push(Math.min(filters.limit??200,500));const rows=db.prepare(`${baseDumpQuery()} WHERE ${where.join(" AND ")} ORDER BY d.favorite DESC,d.updated_at DESC LIMIT ?`).all(...params) as Record<string,unknown>[];return rows.map((row)=>mapDump(userId,row));
}
export function listToday(userId:string){const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);const active=listDumps(userId,{limit:500}).filter((dump)=>!["done","cancelled"].includes(dump.status));return{overdue:active.filter((dump)=>dump.dueAt&&dump.dueAt<start.toISOString()),today:active.filter((dump)=>dump.dueAt&&dump.dueAt>=start.toISOString()&&dump.dueAt<end.toISOString()),important:active.filter((dump)=>dump.priority==="urgent"||dump.priority==="high"||dump.favorite).slice(0,8),recent:listDumps(userId,{limit:6})}}
export function updateDump(userId:string,id:number,input:Partial<Pick<DumpRecord,"title"|"content"|"type"|"status"|"priority"|"dueAt"|"projectId"|"favorite"|"parentId"|"archivedAt">>&{tags?:string[]}){
  const current=getDump(userId,id);if(!current)return null;const status=input.status??current.status;const now=new Date().toISOString();
  db.prepare(`UPDATE dumps SET title=?,content=?,type=?,status=?,priority=?,due_at=?,project_id=?,favorite=?,parent_id=?,archived_at=?,completed_at=?,updated_at=? WHERE id=? AND user_id=?`).run(input.title===undefined?current.title:input.title||null,input.content??current.content,input.type??current.type,status,input.priority??current.priority,input.dueAt===undefined?current.dueAt:input.dueAt,input.projectId===undefined?current.projectId:input.projectId,input.favorite===undefined?Number(current.favorite):Number(input.favorite),input.parentId===undefined?current.parentId:input.parentId,input.archivedAt===undefined?current.archivedAt:input.archivedAt,status==="done"?current.completedAt??now:null,now,id,userId);
  if(input.tags)setDumpTags(userId,id,input.tags);return getDump(userId,id);
}
export function deleteDump(userId:string,id:number){return db.prepare("DELETE FROM dumps WHERE id=? AND user_id=?").run(id,userId).changes>0}
function mapProject(row:Record<string,unknown>):ProjectRecord{return{id:Number(row.id),name:String(row.name),description:row.description?String(row.description):null,color:String(row.color),icon:row.icon?String(row.icon):null,status:row.status as ProjectRecord["status"],dumpCount:Number(row.dump_count??0),createdAt:String(row.created_at),updatedAt:String(row.updated_at)}}
export function listProjects(userId:string){return(db.prepare(`SELECT p.*,COUNT(d.id) dump_count FROM projects p LEFT JOIN dumps d ON d.project_id=p.id AND d.user_id=p.user_id WHERE p.user_id=? GROUP BY p.id ORDER BY p.status,p.name`).all(userId) as Record<string,unknown>[]).map(mapProject)}
export function getProject(userId:string,id:number){return listProjects(userId).find((project)=>project.id===id)??null}
export function createProject(userId:string,input:{name:string;description?:string|null;color?:string;icon?:string|null}){const now=new Date().toISOString();const result=db.prepare(`INSERT INTO projects(user_id,name,description,color,icon,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`).run(userId,input.name,input.description??null,input.color??"#e7653b",input.icon??null,now,now);return listProjects(userId).find((project)=>project.id===Number(result.lastInsertRowid))!}
export function updateProject(userId:string,id:number,input:Partial<Pick<ProjectRecord,"name"|"description"|"color"|"icon"|"status">>){const current=listProjects(userId).find((project)=>project.id===id);if(!current)return null;db.prepare(`UPDATE projects SET name=?,description=?,color=?,icon=?,status=?,updated_at=? WHERE id=? AND user_id=?`).run(input.name??current.name,input.description===undefined?current.description:input.description,input.color??current.color,input.icon===undefined?current.icon:input.icon,input.status??current.status,new Date().toISOString(),id,userId);return listProjects(userId).find((project)=>project.id===id)!}
export function deleteProject(userId:string,id:number){return db.prepare("DELETE FROM projects WHERE id=? AND user_id=?").run(id,userId).changes>0}
export function listTags(userId:string){return(db.prepare(`SELECT t.*,COUNT(dt.dump_id) dump_count FROM tags t LEFT JOIN dump_tags dt ON dt.tag_id=t.id WHERE t.user_id=? GROUP BY t.id ORDER BY t.name`).all(userId) as Record<string,unknown>[]).map(mapTag)}
export function createTag(userId:string,input:{name:string;color?:string}){const now=new Date().toISOString();db.prepare("INSERT INTO tags(user_id,name,color,created_at) VALUES(?,?,?,?)").run(userId,input.name.toLowerCase(),input.color??"#72819a",now);return listTags(userId).find((tag)=>tag.name===input.name.toLowerCase())!}
export function deleteTag(userId:string,id:number){return db.prepare("DELETE FROM tags WHERE id=? AND user_id=?").run(id,userId).changes>0}
export function addAttachment(userId:string,dumpId:number,input:{name:string;url:string;mimeType?:string|null;size?:number|null}){if(!getDump(userId,dumpId))return null;const now=new Date().toISOString();db.prepare("INSERT INTO attachments(dump_id,user_id,name,url,mime_type,size,created_at) VALUES(?,?,?,?,?,?,?)").run(dumpId,userId,input.name,input.url,input.mimeType??null,input.size??null,now);return getDump(userId,dumpId)}
export function deleteAttachment(userId:string,id:number){return db.prepare("DELETE FROM attachments WHERE id=? AND user_id=?").run(id,userId).changes>0}
