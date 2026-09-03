// src/types.ts
export type DumpType = "note" | "task" | "idea" | "bug" | "reminder";
export type NoteType = "bug" | "task" | "idea" | "reminder" | "information";
export type DumpStatus = "inbox" | "todo" | "in_progress" | "done" | "cancelled";
export type Priority = "low" | "normal" | "high" | "urgent";

export interface ClassificationResult {
  type: NoteType;
  priority: Priority;
  project: string | null;
  dueDate: string | null;
  tags: string[];
  confidence: number;
  scores: Record<string, number>;
  signals: string[];
}

export interface ProjectRecord {
  id: number; name: string; description: string | null; color: string; icon: string | null;
  status: "active" | "archived"; dumpCount: number; createdAt: string; updatedAt: string;
}

export interface TagRecord { id: number; name: string; color: string; dumpCount: number; createdAt: string; }
export interface AttachmentRecord { id: number; name: string; url: string; mimeType: string | null; size: number | null; createdAt: string; }

export interface DumpRecord {
  id: number; userId: string; title: string | null; content: string; type: DumpType; status: DumpStatus; priority: Priority;
  dueAt: string | null; projectId: number | null; project: Pick<ProjectRecord, "id" | "name" | "color" | "icon"> | null;
  tags: TagRecord[]; attachments: AttachmentRecord[]; favorite: boolean; parentId: number | null;
  createdAt: string; updatedAt: string; archivedAt: string | null; completedAt: string | null;
}

export interface DumpFilters {
  type?: DumpType; status?: DumpStatus | "active" | "archived"; projectId?: number; tag?: string; search?: string; favorite?: boolean; limit?: number;
}
