import { createHash } from "node:crypto";
import { database as db, listProjects } from "../database/database.js";
import { classifyNote } from "./classify.js";
import type { DumpType } from "../types.js";

// Deux premiers mots significatifs : petite préférence répétable, sans texte brut.
function signature(content:string){
  const words=content.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().match(/[a-z]{3,}/g)??[];
  const terms=words.filter((word)=>!["note","tache","idee","rappel","bug","une","les","des","pour","avec","dans"].includes(word)).slice(0,2);
  return terms.length===2?createHash("sha256").update(terms.join(" ")).digest("hex"):null;
}
export function triagePreferences(userId:string){
  const row=db.prepare("SELECT enabled FROM triage_preferences WHERE user_id=?").get(userId) as {enabled:number}|undefined;
  const count=db.prepare("SELECT count(*) count FROM triage_patterns WHERE user_id=?").get(userId) as {count:number};
  return {enabled:Boolean(row?.enabled),patterns:count.count};
}
export function setTriagePreferences(userId:string,enabled:boolean){
  db.prepare("INSERT INTO triage_preferences(user_id,enabled) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled").run(userId,Number(enabled));
  return triagePreferences(userId);
}
export function resetTriagePreferences(userId:string){
  db.transaction(()=>{db.prepare("DELETE FROM triage_patterns WHERE user_id=?").run(userId);setTriagePreferences(userId,false)})();
  return triagePreferences(userId);
}
export function rememberCorrection(userId:string,content:string,type:DumpType){
  if(!triagePreferences(userId).enabled)return;
  const key=signature(content);if(!key)return;
  db.prepare(`INSERT INTO triage_patterns(user_id,signature,type,updated_at) VALUES(?,?,?,?)
    ON CONFLICT(user_id,signature) DO UPDATE SET type=excluded.type,
    confirmations=CASE WHEN type=excluded.type THEN min(confirmations+1,20) ELSE 1 END,updated_at=excluded.updated_at`)
    .run(userId,key,type,new Date().toISOString());
  // Borné par compte, les anciennes associations cèdent leur place.
  db.prepare(`DELETE FROM triage_patterns WHERE user_id=? AND signature NOT IN
    (SELECT signature FROM triage_patterns WHERE user_id=? ORDER BY updated_at DESC,rowid DESC LIMIT 100)`).run(userId,userId);
}
export function analyzeForUser(userId:string,content:string){
  const projects=listProjects(userId).filter((project)=>project.status==="active");
  const result=classifyNote(content,{projects:projects.map((project)=>project.name),includeKnownProjects:false});
  // Aucun projet historique/global n'est proposé s'il n'appartient pas au compte.
  if(!projects.some((project)=>project.name===result.project))result.project=null;
  let suggestedType:DumpType|null=result.confidence>=65?(result.type==="information"?"note":result.type):null;
  let learned=false;
  const key=signature(content);
  if(key&&triagePreferences(userId).enabled&&!result.signals.some((signal)=>signal.includes("préfixe explicite")||signal.includes("case à cocher"))){
    const pattern=db.prepare("SELECT type,confirmations FROM triage_patterns WHERE user_id=? AND signature=?").get(userId,key) as {type:DumpType;confirmations:number}|undefined;
    if(pattern&&pattern.confirmations>=2){suggestedType=pattern.type;learned=true;result.confidence=80;result.signals.push("personal:corrections confirmées")}
  }
  const explanations:Record<string,string>={bug:"Un problème ou une signature d’erreur a été repéré.",task:"La phrase contient une action à réaliser.",idea:"La formulation évoque une idée ou une possibilité.",reminder:"Un rappel ou une date a été repéré.",note:"La formulation correspond à une information à conserver."};
  const explanation=learned?"Vos corrections répétées suggèrent ce type.":suggestedType?explanations[suggestedType]:"Pas assez de signaux : choisissez un type, ou conservez une note.";
  return {...result,suggestedType,explanation,learned};
}
