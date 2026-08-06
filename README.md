# BrainDump

Mini application locale de capture et classification de notes.

## Prérequis

- Node.js 22 ou supérieur
- npm

## Installation

```powershell
npm install
cp .env.exemple .env
npm run dev
```

Renseigner les paramètres Kyros dans `.env`, puis ouvrir `http://localhost:3005`.

## API

Toutes les routes métier exigent une session Kyros valide. Les routes natives LUMA sont :

- `GET /api/braindump/notes`
- `POST /api/braindump/analyze`
- `POST /api/braindump/notes`
- `DELETE /api/braindump/notes/:id`

Les notes sont automatiquement isolées avec l'identifiant Kyros de l'utilisateur connecté. Les routes historiques sous `/api/*` restent disponibles pour l'interface autonome.

Luma OS peut appeler ces routes sans seconde connexion en relayant son jeton Kyros dans l’en-tête `Authorization: Bearer …`. Le client et l’audience LUMA doivent être explicitement autorisés avec `KYROS_LUMA_CLIENT_ID` et `KYROS_LUMA_RESOURCE_AUDIENCE`; le jeton doit posséder le scope `braindump:access`.

## Production locale

```powershell
npm run build
npm start
```
