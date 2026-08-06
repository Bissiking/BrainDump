// src/database/database.ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { ClassificationResult, NoteRecord } from "../types.js";

const databasePath = process.env.BRAINDUMP_DATABASE_PATH
  ? resolve(process.env.BRAINDUMP_DATABASE_PATH)
  : resolve("data/braindump.db");
mkdirSync(dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    priority TEXT NOT NULL,
    project TEXT,
    due_date TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    confidence INTEGER NOT NULL,
    scores TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL
  )
`);

const columns = db.prepare("PRAGMA table_info(notes)").all() as Array<{
  name: string;
}>;

if (!columns.some((column) => column.name === "owner_id")) {
  db.exec("ALTER TABLE notes ADD COLUMN owner_id TEXT");
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_notes_owner_created
  ON notes (owner_id, id DESC)
`);

export function createNote(
  ownerId: string,
  content: string,
  classification: ClassificationResult
): NoteRecord {
  const createdAt = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO notes (owner_id, content, type, priority, project, due_date, tags, confidence, scores, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
  `).run(
    ownerId,
    content,
    classification.type,
    classification.priority,
    classification.project,
    classification.dueDate,
    JSON.stringify(classification.tags),
    classification.confidence,
    JSON.stringify(classification.scores),
    createdAt
  );

  return {
    id: Number(result.lastInsertRowid),
    content,
    ...classification,
    status: "new",
    createdAt
  };
}

export function listNotes(ownerId: string): NoteRecord[] {
  const rows = db.prepare(`
    SELECT * FROM notes
    WHERE owner_id = ?
    ORDER BY id DESC
  `).all(ownerId) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: Number(row.id),
    content: String(row.content),
    type: row.type as NoteRecord["type"],
    priority: row.priority as NoteRecord["priority"],
    project: row.project ? String(row.project) : null,
    dueDate: row.due_date ? String(row.due_date) : null,
    tags: JSON.parse(String(row.tags)),
    confidence: Number(row.confidence),
    scores: JSON.parse(String(row.scores)),
    status: row.status as NoteRecord["status"],
    createdAt: String(row.created_at)
  }));
}

export function deleteNote(ownerId: string, id: number): boolean {
  return db.prepare(`
    DELETE FROM notes
    WHERE id = ? AND owner_id = ?
  `).run(id, ownerId).changes > 0;
}
