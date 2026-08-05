// src/types.ts
export type NoteType = "bug" | "task" | "idea" | "reminder" | "information";
export type Priority = "low" | "normal" | "high" | "urgent";

export interface ClassificationResult {
  type: NoteType;
  priority: Priority;
  project: string | null;
  dueDate: string | null;
  tags: string[];
  confidence: number;
  scores: Record<NoteType, number>;
}

export interface NoteRecord extends ClassificationResult {
  id: number;
  content: string;
  status: "new" | "in_progress" | "done";
  createdAt: string;
}
