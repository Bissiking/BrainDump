import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { ClassificationResult } from "../src/types.js";

const directory = mkdtempSync(join(tmpdir(), "braindump-test-"));
const databasePath = join(directory, "braindump.db");

const legacyDb = new Database(databasePath);
legacyDb.exec(`
  CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  );
  INSERT INTO notes (
    content, type, priority, tags, confidence, scores, status, created_at
  ) VALUES (
    'Note historique', 'information', 'normal', '[]', 35, '{}', 'new',
    '2026-01-01T00:00:00.000Z'
  );
`);
legacyDb.close();

process.env.BRAINDUMP_DATABASE_PATH = databasePath;
const { createNote, deleteNote, listNotes } = await import(
  "../src/database/database.js"
);

const classification: ClassificationResult = {
  type: "task",
  priority: "high",
  project: "LUMA",
  dueDate: null,
  tags: ["integration"],
  confidence: 90,
  scores: { bug: 0, task: 5, idea: 0, reminder: 0, information: 0 }
};

test("migre les notes historiques sans les exposer à un utilisateur", () => {
  assert.deepEqual(listNotes("user-a"), []);
});

test("isole la lecture et la suppression par propriétaire", () => {
  const noteA = createNote("user-a", "Note de A", classification);
  const noteB = createNote("user-b", "Note de B", classification);

  assert.deepEqual(listNotes("user-a").map((note) => note.id), [noteA.id]);
  assert.deepEqual(listNotes("user-b").map((note) => note.id), [noteB.id]);
  assert.equal(deleteNote("user-b", noteA.id), false);
  assert.equal(deleteNote("user-a", noteA.id), true);
  assert.deepEqual(listNotes("user-a"), []);
  assert.equal(listNotes("user-b").length, 1);
});
