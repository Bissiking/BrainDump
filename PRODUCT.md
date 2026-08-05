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

L’usage principal est une capture personnelle et fréquente depuis un navigateur, suivie de la consultation ou de la suppression des notes. L’accès passe par l’authentification Kyros.

## Capabilities and Constraints

- Application web en HTML, CSS et JavaScript natifs, servie par Fastify et TypeScript.
- Persistance locale SQLite.
- Authentification déléguée à Kyros avec code d’autorisation, session serveur, renouvellement de jeton et révocation à la déconnexion.
- Capture, analyse, enregistrement, consultation et suppression de notes.
- Le modèle multi-utilisateur et l’isolation des notes par propriétaire restent une décision ouverte.

## Brand Commitments

Le nom BrainDump et la langue française sont conservés. Le ton peut rester direct et légèrement malicieux, sans gêner la compréhension des actions importantes. La direction d’interface choisie assume les conventions familières d’une application de notes, avec Notion comme niveau de référence pour la clarté, le calme, la lisibilité et la révélation progressive des contrôles.

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
