// src/classifier/classify.ts
import * as chrono from "chrono-node";
import { categoryRules, explicitTypePrefixes, imperativeActions, knownProjects, priorityRules, tagRules } from "./rules.js";
import type { ClassificationResult, NoteType, Priority } from "../types.js";

export interface ClassificationOptions { projects?:string[]; referenceDate?:Date }

const typeOrder:NoteType[]=["bug","reminder","task","idea","information"];
const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g," ").toLowerCase();
const searchable=(value:string)=>normalize(value).replace(/[^a-z0-9#@:+./]+/g," ").replace(/\s+/g," ").trim();
const escapeRegex=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const flexiblePhrase=(phrase:string)=>escapeRegex(searchable(phrase)).replace(/ +/g,"\\s+");
const phrasePattern=(phrase:string)=>new RegExp(`(?:^|[^a-z0-9])${flexiblePhrase(phrase)}(?=$|[^a-z0-9])`,`i`);
const includesPhrase=(text:string,phrase:string)=>phrasePattern(phrase).test(text);
const isNegated=(text:string,phrase:string)=>new RegExp(`(?:^|\\s)(?:pas|plus|jamais|aucun(?:e)?|sans)(?:\\s+de|\\s+d)?\\s+${flexiblePhrase(phrase)}(?=$|\\s)`).test(text);

function findDueDate(content:string,referenceDate:Date){
  const results=chrono.fr.parse(content,referenceDate,{forwardDate:true});
  const result=results.find((candidate)=>{
    const prefix=searchable(content.slice(Math.max(0,candidate.index-18),candidate.index));
    return !/(?:pas|plus|jamais)\s*$/.test(prefix);
  });
  return result?.start.date().toISOString()??null;
}

function findProject(text:string,projects:string[]){
  const candidates=[...new Map([...projects,...knownProjects].filter(Boolean).map((name)=>[searchable(name),name])).values()].sort((a,b)=>b.length-a.length);
  return candidates.find((name)=>includesPhrase(text,name))??null;
}

function explicitHashtagTags(content:string){
  return [...content.matchAll(/#([\p{L}\p{N}][\p{L}\p{N}_-]{1,39})/gu)].map((match)=>searchable(match[1]).replace(/\s+/g,"-")).filter(Boolean);
}

export function classifyNote(content:string,options:ClassificationOptions={}):ClassificationResult{
  const text=searchable(content);
  const scores:Record<NoteType,number>={bug:0,task:0,idea:0,reminder:0,information:0};
  const signals:string[]=[];
  const add=(type:NoteType,points:number,signal:string)=>{scores[type]+=points;signals.push(signal)};

  for(const [type,keywords] of Object.entries(categoryRules) as [NoteType,string[]][]){
    for(const keyword of keywords){
      if(includesPhrase(text,keyword)&&!isNegated(text,keyword))add(type,keyword.includes(" ")?4:2,`${type}:${keyword}`);
    }
  }

  const prefix=text.replace(/^[-*]\s*/,"");
  for(const [type,prefixes] of Object.entries(explicitTypePrefixes) as [NoteType,string[]][]){
    if(prefixes.some((value)=>new RegExp(`^${flexiblePhrase(value)}\\s*[:>-]`).test(prefix)))add(type,10,`${type}:préfixe explicite`);
  }
  if(/^[-*]?\s*\[\s?\]\s*/.test(normalize(content)))add("task",10,"task:case à cocher");

  const startsWithAction=[...categoryRules.task,...imperativeActions].some((verb)=>new RegExp(`^(?:je dois\\s+|il faut\\s+|a\\s+)?${flexiblePhrase(verb)}\\b`).test(prefix));
  if(startsWithAction)add("task",3,"task:action en tête");
  else if(/^(?:je dois|il faut|a faire)\b/.test(prefix))add("task",5,"task:obligation explicite");
  if(/\b(?:bug|erreur|crash|plantage|exception|incident|panne|regression)\b/.test(text)&&!/\b(?:pas de bug|aucun bug|aucune erreur|sans erreur)\b/.test(text))add("bug",3,"bug:problème explicite");
  if(/\b(?:http status|status|code|erreur)\s*[45]\d\d\b|\b(?:404|401|403|429|500|502|503|504)\b|\b(?:typeerror|referenceerror|syntaxerror|stack trace)\b/.test(text))add("bug",5,"bug:signature technique");
  if(/\b(?:pas de bug|aucun bug|aucune erreur|sans erreur|fonctionne maintenant|est corrige)\b/.test(text)){scores.bug=Math.max(0,scores.bug-7);signals.push("bug:négation")}
  if(/https?:\/\//i.test(content))add("information",2,"information:lien");
  if(content.includes("?")&&!startsWithAction)add("information",1,"information:question");

  const dueDate=findDueDate(content,options.referenceDate??new Date());
  if(dueDate)add("reminder",scores.reminder>0?1:startsWithAction?0:1,"reminder:échéance détectée");

  const sorted=typeOrder.map((type)=>[type,scores[type]] as const).sort((a,b)=>b[1]-a[1]||typeOrder.indexOf(a[0])-typeOrder.indexOf(b[0]));
  const [bestType,bestScore]=sorted[0];const secondScore=sorted[1][1];
  const finalType:NoteType=bestScore===0?"information":bestType;

  let priority:Priority="normal";
  const priorityMatch=(rules:string[])=>rules.find((rule)=>includesPhrase(text,rule)&&!isNegated(text,rule));
  const urgent=priorityMatch(priorityRules.urgent);const high=priorityMatch(priorityRules.high);const low=priorityMatch(priorityRules.low);
  if(urgent){priority="urgent";signals.push(`priority:urgent:${urgent}`)}
  else if(high){priority="high";signals.push(`priority:high:${high}`)}
  else if(low){priority="low";signals.push(`priority:low:${low}`)}
  else if(finalType==="bug"&&bestScore>=7){priority="high";signals.push("priority:high:bug confirmé")}

  const project=findProject(text,options.projects??[]);
  if(project)signals.push(`project:${project}`);
  const semanticTags=Object.entries(tagRules).filter(([,keywords])=>keywords.some((keyword)=>includesPhrase(text,keyword)&&!isNegated(text,keyword))).map(([tag])=>tag);
  const tags=[...new Set([...explicitHashtagTags(content),...semanticTags])].slice(0,12);
  const confidence=bestScore===0?30:Math.min(97,Math.round(48+bestScore*4+Math.max(0,bestScore-secondScore)*5-(bestScore===secondScore?12:0)));

  return{type:finalType,priority,project,dueDate,tags,confidence,scores,signals:[...new Set(signals)]};
}
