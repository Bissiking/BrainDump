---
name: BrainDump
description: Un espace calme pour capturer vite et relire clairement.
colors:
  primary: "#425ee8"
  primary-hover: "#314bd0"
  primary-soft: "#edf0ff"
  canvas: "#f7f7f5"
  surface: "#ffffff"
  surface-subtle: "#f1f1ef"
  ink: "#202124"
  muted: "#6f706e"
  border: "#deded9"
  danger: "#bd3232"
  success: "#287a4b"
typography:
  display:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(2.35rem, 5vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  title:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.16
    letterSpacing: "-0.03em"
  body:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "9px 15px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "9px 15px"
    height: "42px"
  note-container:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "19px 20px 17px"
---

# Design System: BrainDump

## Overview

**Creative North Star: "The Clear Desk"**

BrainDump ressemble à un bureau remis au propre juste assez pour que la prochaine pensée trouve immédiatement sa place. La capture est dense et directe; tout ce qui suit ralentit volontairement le rythme pour rendre la collection facile à relire.

L’interface assume les conventions familières d’une application de notes et vise le niveau de retenue de Notion. La personnalité vient de la précision du rythme, de la voix française et du contraste entre le composeur concentré et le canvas respirant, jamais d’un décor ajouté.

**Key Characteristics:**

- Canvas centré et navigation minimale.
- Accent indigo rare, réservé aux actions et au focus.
- Surfaces mates, filets discrets et ombres uniquement en réponse à un état.
- Densité forte pendant la capture, espace généreux pendant la lecture.
- Icônes linéaires cohérentes et contrôles progressivement révélés.

## Colors

La palette associe un papier neutre légèrement chaud à une encre franche; l’indigo sert uniquement de repère d’action.

### Primary

- **Indigo Action**: action primaire, focus et petit signe de marque.
- **Indigo Wash**: fond discret des catégories liées aux tâches.

### Neutral

- **Quiet Canvas**: fond général sans contraste décoratif.
- **Clean Sheet**: composeur, cartes et panneau de connexion.
- **Graphite Ink**: titres et contenu principal.
- **Pencil Gray**: texte secondaire et métadonnées.
- **Warm Hairline**: séparateurs et contours.

### Named Rules

**The One Action Rule.** Une vue n’expose qu’une action indigo dominante; analyser, naviguer et supprimer restent secondaires.

**The Semantic Color Rule.** Rouge et vert ne décorent jamais: ils signalent exclusivement une erreur, une suppression ou une réussite.

## Typography

**Display Font:** pile système sans serif
**Body Font:** pile système sans serif

**Character:** La même famille de travail porte toute l’interface. L’autorité vient du poids, de l’échelle et de l’espace, avec un rendu immédiatement familier sur chaque plateforme.

### Hierarchy

- **Display** (700, fluide, 0.98): réservé à la promesse de connexion.
- **Title** (700, 1.75rem, 1.16): titre principal des espaces opératoires.
- **Body** (400, 1rem, 1.65): notes et explications, avec une mesure maximale de 70 caractères.
- **Label** (600, 0.875rem): actions, champs et titres compacts; toujours en casse phrase.

### Named Rules

**The Familiar Voice Rule.** Aucun monospace de costume ni contraste de familles; la hiérarchie doit rester évidente même sans couleur.

## Layout

Le produit utilise un canvas centré de 1120px maximum. Le composeur occupe toute sa largeur, puis la collection passe à deux colonnes aérées. Sous 760px, tout revient à une seule colonne, les actions remplissent la largeur et les métadonnées secondaires se replient sans changer l’ordre de lecture.

L’espacement regroupe étroitement label, champ et actions, puis réserve une séparation nettement plus grande avant la bibliothèque. La barre supérieure reste minimale tant que BrainDump ne possède qu’une vue principale.

## Elevation & Depth

Le système est plat par défaut. Les bordures et les changements de surface portent la structure; une seule ombre ambiante (`0 8px 28px rgba(37, 45, 78, .08)`) apparaît lorsque le composeur reçoit le focus, et le menu de compte utilise une ombre plus élevée parce qu’il flotte réellement au-dessus du canvas.

**The Earned Shadow Rule.** Une ombre indique un changement d’état ou de plan; elle n’accompagne jamais une carte au repos.

## Shapes

Les contrôles compacts utilisent des angles doucement courbés de 8px. Les champs et cartes utilisent 12px; le panneau de connexion peut monter à 16px. Les petits tags restent des rectangles compacts à 6px, jamais des pilules décoratives.

## Components

### Buttons

- **Shape:** rectangle compact et calme (8px).
- **Primary:** indigo plein, texte blanc, hauteur minimale de 42px.
- **Hover / Focus:** indigo assombri au survol, anneau de focus visible et aucun déplacement décoratif.
- **Secondary:** fond transparent avec filet chaud; gagne une surface neutre au survol.

### Chips

- **Style:** fond tonal pâle, texte coloré à contraste lisible, coins de 6px.
- **State:** les couleurs décrivent le type ou la priorité; elles ne sont jamais interactives sans affordance supplémentaire.

### Cards / Containers

- **Corner Style:** courbe moyenne (12px).
- **Background:** feuille blanche sur canvas neutre.
- **Shadow Strategy:** aucune ombre au repos.
- **Border:** filet unique de 1px.
- **Internal Padding:** environ 20px.

### Inputs / Fields

- **Style:** texte sur surface mate, intégré dans un conteneur unique plutôt que dans des cartes imbriquées.
- **Focus:** bordure indigo et ombre ambiante légère sur le composeur entier.
- **Error / Disabled:** message de récupération explicite; opacité réduite uniquement pendant une requête.

### Navigation

La marque, le compte et le nombre de notes suffisent dans la barre supérieure. Le menu de compte révèle l’identité et la déconnexion à la demande. Aucune barre latérale n’est introduite avant qu’une seconde destination réelle existe.

### Capture Composer

Le composeur est la signature opérationnelle: prompt court, textarea qui gagne de la hauteur au focus, analyse structurée en ligne et action d’enregistrement dominante. Le raccourci clavier reste visible sans concurrencer les actions.

## Do's and Don'ts

### Do:

- **Do** réserver l’indigo à l’action primaire, au focus et à quelques repères de classification.
- **Do** garder la capture compacte et la bibliothèque sensiblement plus aérée.
- **Do** afficher les états de chargement, vide, erreur et réussite dans la voix directe de BrainDump.
- **Do** rendre les actions destructives explicites et utilisables au clavier comme au tactile.

### Don't:

- **Don't** ajouter une navigation, une métrique ou une carte sans fonction réelle.
- **Don't** utiliser gradients, verre, halos ou ombres permanentes pour fabriquer de la profondeur.
- **Don't** remplacer les icônes linéaires par des emoji ou des glyphes Unicode.
- **Don't** transformer l’interface en page marketing une fois la session ouverte.
