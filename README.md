# BrainDump V2 · 2.2.0 — Smart & Simple

BrainDump est une application personnelle de capture rapide : on vide ce que l’on a en tête, puis on organise plus tard. Elle regroupe notes, tâches, idées, bugs et rappels autour d’un modèle commun `Dump`.

## Stack

- Fastify 5 et TypeScript
- interface HTML/CSS/JavaScript native, sans framework client
- SQLite avec migrations automatiques au démarrage
- Kyros SSO V4 : PAR, PKCE S256, callback avec `state` et `iss`, jetons RS256 vérifiés par JWKS, session serveur et refresh rotatif

## Organisation du dépôt

- `src/` : serveur, API, authentification, SQLite et moteur de triage.
- `views/` : pages HTML servies par les routes de l’application.
- `public/assets/` : CSS, JavaScript, polices, icônes générées et marque.
- `resources/icons/` : catalogue, SVG sources et licences de référence.
- `scripts/` : génération hors ligne des icônes.
- `test/` : tests serveur et parcours navigateur.
- `DOCS/` : contrats, changements et preuves de validation.

[Arborescence et conventions](DOCS/STRUCTURE.md). Pour exécuter une livraison,
conserver `views/` et `public/` à côté de `dist/` ; les pages ne sont pas copiées
par TypeScript.

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

La validation navigateur utilise Chrome headless et Puppeteer, les routes Fastify réelles et une base SQLite temporaire supprimée en fin de parcours. Seule l’identité Kyros est synthétique : ce test ne remplace pas un parcours contre Kyros V4 réel ni une validation sur téléphone physique. `CHROME_PATH` permet de sélectionner Chrome for Testing ; `VIEWPORTS` et `QA_PORT` sont facultatifs. Les captures et le rapport sont dans `.impeccable/review/v2.2.0/`.

## Intégration Liora — 2.1.0

**Applications connectées**, depuis Paramètres (compte en bas de la sidebar, ou Plus → Paramètres sur mobile), crée l’accès applicatif Liora. Chaque compte consent ensuite séparément à la lecture seule de ses notes datées. Rotation, révocation et contrôle des propriétaires sont disponibles ; les autres types restent privés dans BrainDump. Migration SQLite additive 3 au démarrage. [Configuration et contrat](DOCS/LIORA_2.1.0.md).


## Nouveautés 2.2.0

- **Paramètres** (`/#settings`) : triage personnel, réinitialisation, applications
  connectées, compte et déconnexion au même endroit.
- **Triage expliqué** : suggestion prudente du type, confiance, projet actif,
  tags et échéance. Un choix manuel garde la priorité. Une faible confiance
  conserve une note dans l’Inbox et invite à préciser son type.
- **Captures desktop et mobile** : même choix de projet, tags avec suggestions
  et suppression individuelle, échéance et date de référence facultatives.
  Un projet automatique se distingue de « Aucun » ; « Sans échéance » empêche
  explicitement l’inférence d’une date. Vider un champ de tags déjà modifié retire
  les tags au lieu de rétablir les suggestions.
- **Filtres** : recherche, type et statut visibles ; projet, tag, priorité,
  favoris et dates repliables. L’URL conserve la vue et les filtres au rechargement.
- **Actions rapides** : terminer une tâche, favori, archivage/désarchivage,
  changement de type et édition. Une annulation temporaire est disponible pour
  les actions réversibles ; la suppression définitive reste confirmée.
- **Icônes SVG locales** : sélection Papicons/Lucide, catalogue central et licences
  conservées. [Conventions et remplacement](DOCS/ICONS.md).

### Migration additive 4

Le démarrage ajoute `dumps.reference_at`, `triage_preferences` et
`triage_patterns` dans une transaction idempotente. Aucune date ni pensée
existante n’est reclassée ou réinterprétée. `referenceAt` est distinct de `dueAt`
et ne constitue pas une échéance ; les dates de création/modification sont
visibles dans le détail. Aucune nouvelle donnée n’est exposée à Liora.

Le triage personnel est **désactivé par défaut**. Lorsqu’il est activé, les choix
manuels de type à la création et les changements de type à l’édition alimentent
au plus 100 associations par compte. Deux choix consécutifs identiques sur les
deux premiers mots significatifs permettent une proposition future, sauf préfixe
explicite. Seules l’empreinte de ces mots, le type et un compteur sont conservés ;
cette empreinte n’est pas une garantie d’anonymat. Désactiver ignore et gèle les
associations ; réinitialiser les efface et désactive le mécanisme. Il n’y a ni
modèle global ni appel à une IA externe.

API ajoutée sous `/api` et `/api/braindump` :

- `GET/PATCH/DELETE /preferences/triage` (session requise, propriétaire courant).
- `referenceAt` optionnel pour `POST/PATCH /dumps`.
- Filtres `priority`, `dateField` (`dueAt`, `referenceAt`, `createdAt`, `updatedAt`),
  `from` et `to` (ISO UTC) sur `GET /dumps`.

Les collections restent bornées à 500 éléments ; un compteur de limite invite
à affiner les filtres. [Audit, changements, preuves et limites](DOCS/V2.2.0.md).
