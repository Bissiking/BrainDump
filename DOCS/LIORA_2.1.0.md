# BrainDump 2.1.0 — applications et notes datées Liora

Applications connectées est accessible depuis le compte et depuis Plus sur mobile. Créer une application avec nom et URL de retour Liora exacte, copier son identifiant et la clé affichée une fois, puis les configurer dans Liora → Administration → Intégrations → BrainDump. Le callback est `https://liora.exemple.fr/api/v1/integration-callback`. Liora doit utiliser le même émetteur Kyros que BrainDump.

La clé ne représente aucun utilisateur : elle identifie l'application. Chaque compte consent séparément à la lecture **notes:dated:read**. Les seules ressources accessibles sont ses notes de type `note`, avec une échéance et sans archive. Aucun accès en écriture, tâche, idée, bug, rappel ou note sans date. Un snapshot au-delà de 500 notes datées actives est refusé, pour éviter un import incomplet. Le résultat comprend sujet et émetteur que Liora compare à son identité locale.

## Contrat serveur

- `GET/POST /api/integrations/clients` : session BrainDump, création et liste des applications personnelles ; origine exacte exigée sur toute mutation de gestion.
- `POST /api/integrations/clients/:id/rotate`, `DELETE /api/integrations/clients/:id` : propriétaire uniquement, rotation/révocation invalident tous les accès de cette application.
- `DELETE /api/integrations/grants/:id` : compte ayant consenti uniquement ; révoque sa propre autorisation.
- `GET /api/integrations/capabilities` : `Authorization: Bearer <clé application>`, identifiant, émetteur, fournisseur, version de contrat et scope.
- `GET/POST /integrations/authorize` : session Kyros V4, consentement explicite, identité et origine de destination affichées, CSRF lié à la session, état opaque et PKCE S256. Aucun redirect sauvage. Le parcours reprend après login Kyros.
- `POST /api/integrations/token` : clé application ; code d'autorisation à usage unique et verifier PKCE, ou refresh rotatif. Renvoie `access_token`, `refresh_token`, `expires_in`, `scope`, `sub`, `identity_issuer`.
- `POST /api/integrations/revoke` : clé application et refresh ; suppression logique de l'autorisation associée.
- `GET /api/integrations/notes` : clé application et `X-BrainDump-User-Token`, snapshot privé `{data,sub,identity_issuer}`.

Codes cinq minutes, accès quinze minutes, refresh trente jours glissants. Clés/codes/jetons stockés seulement en SHA-256. Sessions et secrets Kyros restent côté serveur. Toutes les réponses de ce module portent Cache-Control no-store et Referrer-Policy no-referrer ; seule la page de consentement utilise same-origin pour permettre le formulaire natif, sans transmettre sa query à une autre origine. URLs de retour HTTPS, sans identifiants, fragment ni paramètres ; boucle HTTP seulement explicitement en développement local. Les tests injectent cette exception sur leurs routeurs isolés.

## Mise à jour

Version package et lock : **2.1.0**. Migration SQLite additive 3 exécutée au démarrage : `connected_apps`, `app_codes`, `app_grants`. Sauvegarder `data/braindump.db` avant démarrage. Aucune suppression de notes ou réattribution des propriétaires ; les tables de délégation sont séparées. Pas de nouvelles variables Kyros nécessaires pour Liora ; les variables `KYROS_LUMA_*` restent réservées à l'ancien relais bearer.

Le développement et les tests exigent Node ≥22. Validation locale effectuée avec Node 24.19.0 ; ne pas lancer le module SQLite natif sous une version Node non prise en charge. Les fixtures n'ouvrent pas la base personnelle.

## Qualification locale du 5 octobre 2026

Build TypeScript et **18/18 tests** réussis sous Node 24.19.0. Les nouveaux tests utilisent une SQLite en mémoire et le routeur réel : origines, URL de retour, échappement du nom, PKCE, code unique, identité, scope daté, exclusion des autres propriétaires/types/archives, rotation et révocation sans suppression des dumps.

Depuis le dépôt Liora, `npm run test:e2e:braindump` exerce les véritables routes et assets BrainDump avec SQLite en mémoire, Chrome/Puppeteer desktop 1440×1000 et mobile 390×844 : création, configuration, consentement natif, récupération et modification distante des notes puis retrait personnel de l’accès. Identités Kyros et notes synthétiques, sans vraie session fournisseur ni ouverture de la base personnelle. Ce parcours ne certifie pas le déploiement ou le SSO réel.
