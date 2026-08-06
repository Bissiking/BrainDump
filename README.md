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

## Production locale

```powershell
npm run build
npm start
```
