// test/classifier.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { classifyNote } from "../src/classifier/classify.js";

const referenceDate=new Date("2026-09-03T10:00:00+02:00");
const classify=(content:string,projects:string[]=[])=>classifyNote(content,{projects,referenceDate});

test("distingue un bug actionnable et enrichit son contexte",()=>{
  const result=classify("Corriger l’erreur HTTP 500 urgente sur l’API Kyros avant demain");
  assert.equal(result.type,"bug");
  assert.equal(result.priority,"urgent");
  assert.equal(result.project,"Kyros");
  assert.equal(result.tags.includes("api"),true);
  assert.equal(result.dueDate!==null,true);
  assert.equal(result.confidence>=80,true);
});

test("une action datée reste une tâche, sauf intention explicite de rappel",()=>{
  assert.equal(classify("Appeler le dentiste demain à 18 h").type,"task");
  assert.equal(classify("Rappel: appeler le dentiste demain à 18 h").type,"reminder");
  assert.equal(classify("Dentiste demain à 18 h").type,"reminder");
});

test("reconnaît les formulations d'idée, les préfixes et les cases à cocher",()=>{
  assert.equal(classify("On pourrait ajouter un mode focus mobile #UX").type,"idea");
  assert.equal(classify("Peut-être refaire la navigation de Nino").type,"idea");
  assert.equal(classify("Note: commande de diagnostic à conserver").type,"information");
  assert.equal(classify("- [ ] Publier la release de BrainDump").type,"task");
  assert.equal(classify("Je dois revoir le budget").type,"task");
});

test("évite les sous-chaînes et tient compte des négations",()=>{
  const result=classify("Le déploiement est terminé sans erreur, ce n’est pas urgent et c’est rapide.");
  assert.equal(result.type,"information");
  assert.equal(result.priority,"normal");
  assert.equal(result.tags.includes("api"),false);
});

test("extrait les hashtags et les projets réels de l'utilisateur",()=>{
  const result=classify("Préparer les plans Maison #Architecture #ÀFaire",["Maison","Vacances"]);
  assert.equal(result.type,"task");
  assert.equal(result.project,"Maison");
  assert.deepEqual(result.tags.filter((tag)=>["architecture","afaire"].includes(tag)),["architecture","afaire"]);
});

test("préfère le nom de projet le plus spécifique",()=>{
  assert.equal(classify("Tester le service Argos Prob").project,"Argos Prob");
});

test("retourne des signaux explicables et une confiance prudente par défaut",()=>{
  const unknown=classify("Une pensée sans marqueur particulier");
  assert.equal(unknown.type,"information");
  assert.equal(unknown.confidence,30);
  assert.deepEqual(unknown.signals,[]);
  const explicit=classify("Idée: une vue hebdomadaire");
  assert.equal(explicit.signals.includes("idea:préfixe explicite"),true);
  assert.equal(explicit.confidence>unknown.confidence,true);
});
