# Organisation du dépôt

```text
BrainDump/
├── src/                         # Fastify et logique serveur
│   ├── auth/                    # Kyros SSO V4 et sessions
│   ├── classifier/              # Triage et préférences personnelles
│   ├── database/                # SQLite et migrations
│   ├── integrations/            # Applications, consentement et lecture Liora
│   ├── web/paths.ts              # Racines des fichiers publics et des pages
│   ├── api-routes.ts
│   ├── server.ts
│   └── types.ts
├── views/                       # Pages HTML, hors du répertoire statique
│   ├── index.html
│   ├── login.html
│   └── integrations.html
├── public/                      # Fichiers servis directement par Fastify
│   ├── favicon.ico              # Emplacement conventionnel du navigateur
│   └── assets/
│       ├── branding/            # Logos, favicons SVG/PNG et icône Apple
│       ├── css/                 # app.css commun et integrations.css
│       ├── fonts/               # Polices locales WOFF2
│       ├── icons/               # Sprite SVG et licences distribuées
│       └── js/
│           ├── pages/           # app.js, login.js et integrations.js
│           └── shared/          # auth.js, ui.js et icons.js généré
├── resources/icons/             # Sources de travail, non servies au navigateur
│   ├── catalog.json             # Noms sémantiques et provenance des icônes
│   ├── licenses/                # Textes amont de référence
│   └── sources/                 # SVG BrainDump, Lucide et Papicons sélectionnés
├── scripts/build-icons.mjs       # Génération locale du sprite et du registre JS
├── test/                        # Tests unitaires, API, migrations et navigateur
├── DOCS/                        # Contrats, conventions et preuves
└── .impeccable/                  # Contexte visuel et captures de validation
```

## Conventions

Une page appartient à `views/` ; son point d’entrée JavaScript va dans
`public/assets/js/pages/`. Les utilitaires communs restent dans `js/shared/`,
avec imports relatifs entre modules. Les liens vers les ressources des pages
sont absolus (`/assets/...`) afin de fonctionner aussi depuis une URL imbriquée.
Les URL de polices dans les CSS sont relatives au fichier de style.

`src/web/paths.ts` résout les répertoires depuis le module serveur, aussi bien
en développement (`src/web/`) qu’après compilation (`dist/web/`). Les routes
`/`, `/login` et `/integrations` servent leurs pages depuis `views/` et conservent
leurs contrôles de session. La navigation interne et Paramètres gardent leurs
fragments d’URL existants.

Pour modifier une icône, changer `resources/icons/catalog.json` et les sources,
puis lancer `npm run icons:build`. Le générateur crée le sprite, le registre JS
et les copies des licences dans `public/assets/`. Les fichiers générés sont
conservés dans le dépôt : aucun téléchargement ou générateur n’est nécessaire
au démarrage de l’application. Voir [les conventions d’icônes](ICONS.md).

Une livraison doit contenir `dist/`, `views/` et `public/`, ainsi que les
dépendances serveur et la configuration habituelles. `resources/` et `scripts/`
sont utiles pour régénérer les icônes, sans être requis pour les servir.
Cette réorganisation ne déplace ni la base SQLite ni les secrets.

## Validation de la réorganisation

Les validations sont consignées dans [la livraison 2.2.0](V2.2.0.md).
