# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Le produit est d’abord utilisé personnellement par son créateur pour capturer rapidement des pensées. Une ouverture future à plusieurs personnes reste possible, sans être un besoin immédiat confirmé.

## Product Purpose

BrainDump permet de déposer une note libre, de la classifier automatiquement, puis de retrouver les informations structurées qui en résultent. Le succès du produit repose sur un parcours de capture très rapide et un rangement utile sans effort manuel.

## Positioning

Le produit transforme directement une pensée non structurée en note classée par type, priorité, projet, échéance et tags grâce à un moteur de règles local.

## Operating Context

L’usage principal est une capture personnelle et fréquente depuis un navigateur, suivie du tri dans l’Inbox, de la planification dans Aujourd’hui et de la consultation par projet, tag ou recherche. L’accès passe par Kyros SSO V4.

## Capabilities and Constraints

- Application web en HTML, CSS et JavaScript natifs, servie par Fastify et TypeScript.
- Persistance locale SQLite.
- Authentification Kyros SSO V4 avec PAR, PKCE S256, jetons RS256 vérifiés par JWKS, session serveur, renouvellement et révocation.
- Modèle unifié `Dump` pour tâches, notes, idées, liens et rappels, avec statut, priorité, échéance, favori, projet, tags et pièces jointes référencées.
- Inbox, Aujourd’hui, vues par type, projets, tags, recherche globale et panneau de détail avec sauvegarde automatique.
- Les dumps sont isolés par l’identifiant Kyros de leur propriétaire. La migration V1 ne rattache automatiquement que les anciennes notes possédant déjà un propriétaire.

## Brand Commitments

Le nom BrainDump et la langue française sont conservés. Le ton peut rester direct et légèrement malicieux, sans gêner la compréhension des actions importantes. La direction choisie est un établi numérique sombre et précisionniste : plans bleu ardoise, typographie condensée et accent rouille réservé à l’action. La capture reste visuellement dominante sur chaque format.

## Evidence on Hand

Le dépôt contient l’application fonctionnelle et ses textes dans `public/`, les routes serveur dans `src/server.ts`, le moteur de classification dans `src/classifier/` et la persistance dans `src/database/`. Aucun témoignage, logo, donnée marketing ou promesse chiffrée ne doit être inventé.

## Product Principles

- Capturer une pensée avec un minimum de friction.
- Montrer clairement ce que le système a compris.
- Garder l’utilisateur en contrôle de l’enregistrement et de la suppression.
- Protéger l’accès aux notes derrière une session explicite.
- Préserver une architecture qui puisse évoluer vers plusieurs utilisateurs sans prétendre que cette évolution est déjà livrée.

## Accessibility & Inclusion

Les parcours principaux doivent rester utilisables au clavier, avec des libellés explicites, des états de focus visibles, un contraste lisible et une réduction des mouvements lorsque le système la demande.
