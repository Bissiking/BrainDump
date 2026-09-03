// src/classifier/rules.ts
import type { NoteType } from "../types.js";

export const categoryRules:Record<NoteType,string[]>={
  bug:["bug","bugs","erreur","erreurs","crash","plantage","exception","incident","regression","panne","ko","timeout","echec","ne marche pas","ne fonctionne pas","page blanche","stack trace"],
  task:["faire","corriger","ajouter","modifier","installer","verifier","tester","deployer","mettre a jour","preparer","envoyer","appeler","contacter","acheter","reserver","relancer","terminer","finaliser","creer","ecrire","publier","planifier"],
  idea:["idee","imaginer","pourrait","concept","peut etre","ce serait bien","j aimerais","on pourrait","pourquoi ne pas","piste","suggestion","brainstorm"],
  reminder:["rappeler","rappelle moi","rappel","penser a","ne pas oublier","me souvenir","souviens toi","alerte moi"],
  information:["info","information","note","documentation","reference","a savoir","compte rendu","memo","procedure","snippet","commande"]
};

export const explicitTypePrefixes:Record<NoteType,string[]>={
  bug:["bug","incident","erreur"],
  task:["todo","tache","a faire","action"],
  idea:["idee","concept","piste"],
  reminder:["rappel","reminder"],
  information:["note","info","memo"]
};

export const imperativeActions=["corrige","ajoute","modifie","installe","verifie","teste","deploie","prepare","envoie","appelle","contacte","achete","reserve","relance","termine","finalise","cree","publie","planifie"];

export const priorityRules={
  urgent:["urgent","urgente","immediatement","critique","bloquant","bloquee","prod ko","production ko","asap","au plus vite","des que possible","p0"],
  high:["important","importante","prioritaire","avant demain","rapidement","incident","haute priorite","p1"],
  low:["un jour","plus tard","quand j aurai le temps","facultatif","pas presse","basse priorite","nice to have"]
};

export const knownProjects=["BrainDump","Nino","Orion","Kyros","Aion","LUMA","Harmonix","Argos","Argos Prob","Sonora","Drivio","DustBound","Countdown","DropIt","ARC","Orbis"];

export const tagRules:Record<string,string[]>={
  api:["api","endpoint","webhook","route api","rest","graphql"],
  database:["base de donnees","database","sqlite","postgres","postgresql","sql","migration","schema"],
  docker:["docker","conteneur","container","compose","kubernetes","k8s"],
  frontend:["frontend","interface","ui","ux","css","html","responsive","accessibilite"],
  backend:["backend","serveur","fastify","node","service","worker"],
  security:["securite","token","auth","sso","mot de passe","permission","jwt","jwks","pkce"],
  network:["reseau","dns","port","proxy","nginx","traefik","tls","certificat"],
  mobile:["mobile","android","ios","flutter","telephone"],
  release:["release","version","build","deploiement","deployer","publier","store"],
  meeting:["reunion","meeting","point hebdo","rendez vous","rdv"]
};
