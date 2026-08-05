// src/classifier/classify.ts
import * as chrono from "chrono-node";
import { categoryRules, knownProjects, priorityRules, tagRules } from "./rules.js";
import type { ClassificationResult, NoteType, Priority } from "../types.js";

const normalize = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const includesRule = (text: string, rule: string): boolean => normalize(text).includes(normalize(rule));

export function classifyNote(content: string): ClassificationResult {
  const scores: Record<NoteType, number> = {
    bug: 0,
    task: 0,
    idea: 0,
    reminder: 0,
    information: 0
  };

  for (const [type, keywords] of Object.entries(categoryRules) as [NoteType, string[]][]) {
    for (const keyword of keywords) {
      if (includesRule(content, keyword)) scores[type] += keyword.includes(" ") ? 3 : 2;
    }
  }

  if (/\b(?:4\d\d|5\d\d)\b/.test(content)) scores.bug += 3;
  if (content.includes("?")) scores.information += 1;
  if (/\b(?:faire|corriger|ajouter|modifier|installer|tester|verifier|vérifier)\b/i.test(content)) scores.task += 1;

  const parsedDate = chrono.fr.parseDate(content, new Date(), { forwardDate: true });
  if (parsedDate) scores.reminder += 2;

  const sortedTypes = (Object.entries(scores) as [NoteType, number][]).sort((a, b) => b[1] - a[1]);
  const [bestType, bestScore] = sortedTypes[0];
  const secondScore = sortedTypes[1][1];
  const finalType: NoteType = bestScore === 0 ? "information" : bestType;

  let priority: Priority = "normal";
  if (priorityRules.urgent.some((rule) => includesRule(content, rule))) priority = "urgent";
  else if (priorityRules.high.some((rule) => includesRule(content, rule))) priority = "high";
  else if (priorityRules.low.some((rule) => includesRule(content, rule))) priority = "low";
  else if (finalType === "bug" && bestScore >= 5) priority = "high";

  const project = knownProjects.find((name) => includesRule(content, name)) ?? null;
  const tags = Object.entries(tagRules)
    .filter(([, keywords]) => keywords.some((keyword) => includesRule(content, keyword)))
    .map(([tag]) => tag);

  const confidence = bestScore === 0
    ? 35
    : Math.min(98, Math.round(55 + bestScore * 6 + Math.max(0, bestScore - secondScore) * 4));

  return {
    type: finalType,
    priority,
    project,
    dueDate: parsedDate?.toISOString() ?? null,
    tags,
    confidence,
    scores
  };
}
