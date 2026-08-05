// src/classifier/rules.ts
import type { NoteType } from "../types.js";

export const categoryRules: Record<NoteType, string[]> = {
  bug: ["bug", "erreur", "crash", "plantage", "ko", "panne", "exception", "500", "404", "ne marche pas"],
  task: ["faire", "corriger", "ajouter", "modifier", "installer", "vérifier", "tester", "déployer", "mettre à jour"],
  idea: ["idée", "imaginer", "pourrait", "concept", "peut-être", "ce serait bien", "j'aimerais"],
  reminder: ["rappeler", "rappel", "penser à", "ne pas oublier", "demain", "vendredi", "avant", "ce soir"],
  information: ["info", "information", "note", "documentation", "référence", "à savoir"]
};

export const priorityRules = {
  urgent: ["urgent", "immédiatement", "critique", "bloquant", "prod ko", "asap"],
  high: ["important", "prioritaire", "avant demain", "rapidement", "incident"],
  low: ["un jour", "plus tard", "quand j'aurai le temps", "facultatif"]
};

export const knownProjects = ["Nino", "Orion", "Kyros", "Aion", "LUMA", "Harmonix", "DropIt", "ARC"];

export const tagRules: Record<string, string[]> = {
  api: ["api", "endpoint", "route"],
  database: ["base de données", "database", "sqlite", "postgres", "sql"],
  docker: ["docker", "conteneur", "container"],
  frontend: ["frontend", "interface", "ui", "ux", "css", "html"],
  backend: ["backend", "serveur", "fastify", "node"],
  security: ["sécurité", "token", "auth", "mot de passe", "permission"],
  network: ["réseau", "dns", "port", "proxy", "nginx"]
};
