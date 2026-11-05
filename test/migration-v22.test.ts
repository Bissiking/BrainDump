import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import Database from 'better-sqlite3';

test('migration 2.1 vers 2.2 puis second démarrage : dates, tags, intégration et contenu conservés',()=>{
  const root=mkdtempSync(join(tmpdir(),'braindump-migration-v22-')),path=join(root,'v21.db');
  const initial=new Database(path);
  initial.exec(`CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL);
    INSERT INTO schema_migrations VALUES(2,'2026-01-01'),(3,'2026-01-01');
    CREATE TABLE dumps(id INTEGER PRIMARY KEY,user_id TEXT NOT NULL,title TEXT,content TEXT NOT NULL,type TEXT,status TEXT,priority TEXT,due_at TEXT,project_id INTEGER,favorite INTEGER,parent_id INTEGER,created_at TEXT,updated_at TEXT,archived_at TEXT,completed_at TEXT);
    INSERT INTO dumps VALUES(42,'alice','Historique','Préserver exactement','note','inbox','normal','2026-01-01T10:00:00.000Z',NULL,1,NULL,'2025-01-01','2025-02-01',NULL,NULL);
    CREATE TABLE connected_apps(id TEXT PRIMARY KEY,key_hash TEXT);
    INSERT INTO connected_apps VALUES('existing-client','existing-fingerprint');`);
  const before=initial.prepare('SELECT * FROM dumps').get();initial.close();
  try {
    const moduleUrl=new URL('../src/database/database.ts',import.meta.url).href;
    for(let i=0;i<2;i++)execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',`const {database}=await import(${JSON.stringify(moduleUrl)});database.close();`],{cwd:fileURLToPath(new URL('..',import.meta.url)),env:{...process.env,BRAINDUMP_DATABASE_PATH:path},stdio:'pipe'});
    const migrated=new Database(path);
    try{const {reference_at,...after}=migrated.prepare('SELECT * FROM dumps').get() as any;assert.deepEqual(after,before);assert.equal(reference_at,null);assert.equal((migrated.prepare('SELECT count(*) n FROM schema_migrations WHERE version=4').get() as any).n,1);assert.equal((migrated.prepare('SELECT key_hash FROM connected_apps').get() as any).key_hash,'existing-fingerprint');}finally{migrated.close()}
  }finally{rmSync(root,{recursive:true,force:true})}
});
