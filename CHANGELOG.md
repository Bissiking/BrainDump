# Changelog

## 2.2.0 — 5 novembre 2026

- Dossiers frontend organisés : `views/`, `public/assets/` et `resources/icons/`, avec chemins et documentation mis à jour.

- Page Paramètres : triage personnel, réinitialisation, applications connectées et compte.
- Triage expliqué et prudent, corrections manuelles prioritaires et associations locales facultatives isolées par utilisateur.
- Capture mobile complète, suggestions et retrait de tags, échéance automatique préservée et date de référence indépendante.
- Filtres principaux/secondaires avec état dans l’URL, reset et résultats dynamiques.
- Actions rapides sur les lignes et annulation ; autosauvegarde sérialisée attachée à l’identifiant de la pensée.
- Catalogue SVG local Papicons/Lucide, génération hors ligne et licences distribuées ; marque BrainDump préservée.
- Migration additive 4 ; contrat Liora 2.1.0 conservé, sans nouvelle donnée exposée. HUB reste hors périmètre.
- Validation navigateur sur API réelle et SQLite temporaire, session Kyros synthétique. [Détails et limites](DOCS/V2.2.0.md).

## 2.1.0 — 5 octobre 2026

- Applications connectées : enregistrement de Liora, clé affichée une fois, rotation et révocation par propriétaire.
- Consentement personnel pour la lecture des notes datées, PKCE S256, codes à usage unique, jetons rotatifs stockés en empreintes et isolation entre comptes.
- API de capacités, notes datées et renouvellement ; aucun accès en écriture ou aux autres types.
- Accès depuis le menu du compte et Plus sur mobile. Migration SQLite additive 3 ; [configuration](DOCS/LIORA_2.1.0.md).

## 2.0.1

Version précédente conservée dans l'historique Git ; aucune reconstruction de notes de version historiques.
