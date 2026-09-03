# BrainDump V2

BrainDump est une application personnelle de capture rapide : on vide ce que l’on a en tête, puis on organise plus tard. Elle regroupe notes, tâches, idées, bugs et rappels autour d’un modèle commun `Dump`.

## Stack

- Fastify 5 et TypeScript
- interface HTML/CSS/JavaScript native, sans framework client
- SQLite avec migrations automatiques au démarrage
- Kyros SSO V4 : PAR, PKCE S256, callback avec `state` et `iss`, jetons RS256 vérifiés par JWKS, session serveur et refresh rotatif

## Lancer le projet

```bash
npm install
cp .env.exemple .env
npm run dev
```

Ouvrir ensuite `http://localhost:3005`.

## Migration V1 vers V2

Au premier démarrage, BrainDump crée `projects`, `dumps`, `tags`, `dump_tags` et `attachments`, puis enregistre la migration dans `schema_migrations`.

- chaque ancienne note avec `owner_id` est copiée dans `dumps` ;
- `information` devient `note` ;
- les projets et tags historiques sont conservés et normalisés ;
- la table `notes` reste en place pour permettre un retour arrière ;
- les anciennes lignes sans propriétaire ne sont pas attribuées arbitrairement et restent inaccessibles.

Sauvegarder `data/braindump.db` avant une première montée de version en production reste recommandé.

## Kyros SSO V4

Le client Kyros associé à BrainDump doit être configuré avec `sso_protocol_version=v4`. Kyros doit exposer `/par`, `/authorize`, `/token`, `/revoke` et `/sso/v4/jwks`. En production, activer également SSO V4 côté Kyros et vérifier `/health/ready` avant de basculer le client.

`KYROS_REQUESTED_SCOPES` doit correspondre aux scopes autorisés sur le client Kyros. S’il est omis, BrainDump demande désormais la valeur de `KYROS_REQUIRED_SCOPES`, ce qui évite qu’un scope par défaut différent provoque `invalid_scope` pendant la requête PAR.

BrainDump ne stocke aucun mot de passe. Les secrets client, refresh tokens et codes PKCE restent côté serveur et les champs sensibles sont masqués dans les logs.

## API

Toutes les routes exigent une session Kyros ou un bearer Kyros explicitement autorisé. Les ressources sont systématiquement filtrées par l’identifiant du propriétaire.

- `GET/POST /api/dumps`
- `GET/PATCH/DELETE /api/dumps/:id`
- `GET /api/today`
- `POST /api/analyze`
- `GET/POST /api/projects`
- `PATCH/DELETE /api/projects/:id`
- `GET/POST /api/tags`
- `DELETE /api/tags/:id`
- `POST /api/dumps/:id/attachments`
- `DELETE /api/attachments/:id`

Les pièces jointes V2 sont des références HTTPS avec nom, type MIME et taille optionnels. Le stockage binaire et son service d’upload ne sont pas simulés par BrainDump : ils doivent être fournis par un stockage privé dédié avant d’exposer un sélecteur de fichiers dans l’interface.

Les mêmes routes existent sous `/api/braindump`. Les routes V1 `/api/notes` sont conservées comme compatibilité de transition.

## Triage automatique

Le moteur local combine des signaux pondérés plutôt qu’une simple recherche de sous-chaînes : préfixes explicites (`Tâche:`, `Idée:`, `Rappel:`), verbes d’action, formulations conditionnelles, signatures HTTP/JavaScript, négations, échéances françaises, hashtags et vocabulaire technique. Une date enrichit l’échéance sans transformer automatiquement une action en rappel. Les projets actifs de l’utilisateur sont injectés dans l’analyse, et la réponse `/api/analyze` expose `scores`, `confidence` et `signals` pour rendre la décision explicable. Pendant la frappe, l’interface affiche cette lecture dans le champ de capture sans effectuer d’écriture en base; rien n’est conservé avant l’action « Ajouter à l’Inbox ».

## Validation

```bash
npm run build
npm test
npm run visual:qa
```

La validation visuelle locale utilise Chrome installé sur macOS et un serveur de données simulé ; elle ne remplace pas un parcours réel contre une instance Kyros V4 configurée.
