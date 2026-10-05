---
name: BrainDump
description: Un établi numérique sombre et précisionniste pour capturer, trier et agir sans quitter le flux.
colors:
  canvas: "#1c2a38"
  sidebar: "#101b27"
  plane-2: "#1b2a38"
  plane-3: "#243340"
  field: "#1d2c39"
  control-plane: "#172633"
  nav-active: "#20303e"
  selection-plane: "#27333c"
  line: "#3d4c58"
  line-soft: "#32424f"
  ink: "#f0f1f2"
  muted: "#b2bac1"
  faint: "#85919c"
  accent: "#d85d30"
  accent-hover: "#ed7042"
  integration-primary: "#b7461c"
  integration-primary-hover: "#bf4c22"
  danger: "#ef6b64"
  success: "#61c58b"
  warning: "#f1b95d"
  focus: "#f6a183"
  on-accent: "#ffffff"
typography:
  hero:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(58px, 6.3vw, 104px)"
    fontWeight: 400
    lineHeight: 0.88
    letterSpacing: "0.005em"
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "56px"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.015em"
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "38px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.01em"
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.05
  body-prominent:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  action:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
  metadata:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: "0"
  tight: "3px"
  control: "4px"
  field: "5px"
  surface: "6px"
  trigger: "7px"
  menu: "8px"
  dialog: "9px"
  sheet: "15px"
  round: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "30px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  integration-button-primary:
    backgroundColor: "{colors.integration-primary}"
    textColor: "{colors.on-accent}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "46px"
  integration-button-primary-hover:
    backgroundColor: "{colors.integration-primary-hover}"
    textColor: "{colors.on-accent}"
  type-choice:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "58px"
  type-choice-selected:
    backgroundColor: "{colors.selection-plane}"
    textColor: "{colors.accent}"
    rounded: "{rounded.none}"
  text-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.body-prominent}"
    rounded: "{rounded.field}"
    padding: "14px 16px"
  nav-active:
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.surface}"
    padding: "0 13px"
    height: "51px"
  tag:
    backgroundColor: "{colors.control-plane}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "8px 10px"
---

# Design System: BrainDump

## Overview

**Creative North Star: "L’établi numérique précisionniste"**

BrainDump ressemble à un outil de terrain personnel : des plans bleu ardoise mats, des filets techniques et une encre claire installent un espace calme où la pensée peut être déposée sans mise en scène superflue. La capture domine visuellement; l’organisation vient ensuite, dans une densité utile plutôt que dans une mosaïque de cartes.

La voix condensée et légèrement imprimée donne de la présence aux titres, tandis qu’IBM Plex Sans maintient les contrôles et les données nets. L’orange rouille est rare et opérationnel : il désigne l’action courante, la sélection et quelques repères d’état, jamais le décor.

L’extension 2.1.0 ajoute Applications connectées et le consentement personnel pour Liora 0.7.1 dans ce monde existant. Le contrat `.impeccable/surfaces/liora-integration.md` distingue la configuration d’une application de l’autorisation de chaque compte et limite la lecture aux notes datées. Les sources `public/integrations.html`, `integrations.css`, `integrations.js` et le consentement de `src/integrations/routes.ts` prolongent les primitives natives ; l’entrée Applications connectées reste accessible depuis la navigation existante. Aucune comp ni raster de produit n’a été créé.

Les onze captures `brain-*.png`, conservées dans le dépôt Liora sous `.impeccable/review/`, couvrent applications, configuration, consentement et notes sur desktop (1440 × 1000) et mobile (390 × 844). Les captures des applications montrent le document complet ; les compléments `actions` / `content` montrent le défilement interne de Liora. La revue `finish-braindump.md` conclut **ship** à la portée de F1, résolue par le lien textuel « Retour à BrainDump » du consentement ; aucune autre correction matérielle n’était signalée par la première revue. Les 18 tests et la compilation BrainDump, les 72 tests et la compilation Liora et les parcours Chrome headless/Puppeteer locaux sont rapportés comme passés, avec routeurs et stockages réels et SQLite en mémoire côté BrainDump. Les identités, fournisseurs et contenus sont synthétiques ; Kyros réel, production, états focus/erreur/chargement exhaustifs et mouvement normal restent non certifiés. Cette fusion documentaire n’a relancé ni navigateur, tests ni détecteur.

**Key Characteristics:**

- Plans sombres continus séparés par des filets fins.
- Capture surdimensionnée, immédiatement accessible.
- Titres condensés à bord sec et contenu courant sobre.
- Accent rouille parcimonieux et toujours signifiant.
- Chanfrein diagonal réservé aux actions primaires et sélections.

## Colors

La palette associe des bleus ardoise faiblement chromatiques à une encre froide et un seul accent rouille énergique; les couleurs d’état restent strictement sémantiques.

### Primary

- **Rouille d’action** (`accent`): action primaire, sélection active, caret et repère de navigation.
- **Rouille vive** (`accent-hover`): survol des actions primaires uniquement.
- **Rouille de consentement** (`integration-primary`) et **rouille de survol d’intégration** (`integration-primary-hover`): variantes locales des boutons primaires d’Applications connectées et du consentement, extraites de `public/integrations.css`. Le texte blanc atteint respectivement (5,38:1) et (4,92:1), selon le calcul de luminance WCAG consigné dans la revue. Ces valeurs ne remplacent pas les accents de capture ou de navigation.

### Tertiary

- **Corail de danger** (`danger`): suppression, déconnexion et erreurs.
- **Vert de résolution** (`success`): état terminé et confirmation positive.
- **Ambre d’échéance** (`warning`): urgence temporelle, priorité et favori.
- **Pêche de focus** (`focus`): contour clavier global à fort contraste.

### Neutral

- **Ardoise canvas** (`canvas`): fond continu du workspace et du panneau contextuel.
- **Bleu nuit de navigation** (`sidebar`): rail desktop, en-tête de connexion et barre mobile.
- **Ardoise intérieure** (`plane-2`): champs, feuilles mobiles et surfaces secondaires.
- **Plan de capture** (`plane-3`): surface dominante de saisie et navigation active.
- **Champ ardoise** (`field`): textarea principal et champ de démonstration.
- **Plan de contrôle** (`control-plane`): formulaires, projets et tags.
- **Navigation active** (`nav-active`): fond de la destination sélectionnée.
- **Cœur de sélection** (`selection-plane`): intérieur des choix de type chanfreinés.
- **Filet technique** (`line`): séparateurs, contours de champs et limites de plans.
- **Filet discret** (`line-soft`): divisions secondaires et listes denses.
- **Encre froide** (`ink`): texte principal et titres.
- **Graphite lisible** (`muted`): texte secondaire et contrôles inactifs.
- **Graphite lointain** (`faint`): métadonnées et indications non prioritaires.
- **Blanc d’action** (`on-accent`): texte et pictogrammes sur fond rouille.

### Named Rules

**The One Rust Action Rule.** Une vue ne présente qu’une action rouille de poids équivalent; sa rareté donne la hiérarchie.

**The Semantic Signal Rule.** Le corail, le vert et l’ambre ne servent jamais d’ornement et le sens ne repose jamais sur la couleur seule.

## Typography

**Display Font:** Barlow Condensed (with sans-serif)

**Body Font:** IBM Plex Sans (with sans-serif)

**Character:** Barlow Condensed porte une voix étroite, mécanique et légèrement imprimée; un bord sec discret renforce les grands titres. IBM Plex Sans apporte la stabilité nécessaire aux actions, aux données et aux textes éditables.

### Hierarchy

- **Hero** (`hero`): accroche de connexion fluide, utilisée uniquement quand la surface peut laisser respirer de très grandes lignes.
- **Display** (`display`): invitation de capture; elle descend à 52 px sur desktop resserré et 46 px sur mobile.
- **Headline** (`headline`): titre de vue principal, compact et fortement identifiable.
- **Title** (`title`): titres de panneaux, d’états vides et d’éditeur.
- **Body prominent** (`body-prominent`): saisie, démonstration et contenu qui réclament une lecture immédiate.
- **Body** (`body`): commandes, navigation et texte courant.
- **Action** (`action`): libellé d’action primaire, toujours en graisse 600.
- **Label** (`label`): groupes, compteurs et contrôles compacts.
- **Metadata** (`metadata`): dates, projet, tags et états secondaires; 11 px est le plancher fonctionnel.

### Named Rules

**The Condensed Authority Rule.** La police condensée structure les titres et la marque; elle ne remplace jamais la police de lecture dans les champs, listes ou métadonnées.

**The No Decorative Caps Rule.** Aucun texte en capitales espacées n’est utilisé comme ornement.

## Layout

Le bureau est un poste à trois plans plein viewport : navigation de 252 px, workspace fluide d’au moins 620 px et contexte de 382 px. Le workspace empile un en-tête de 88 px, une capture de 450 px et une liste scrollable; la capture conserve davantage d’espace latéral que la liste afin d’imposer le geste d’écriture.

Entre 1101 et 1450 px, les colonnes se resserrent à 236 px et 363 px et la capture descend à 422 px. De 721 à 1100 px, la navigation devient un rail de 82 px, le panneau contextuel se transforme en tiroir de 390 px et le workspace prend le reste. À 720 px et moins, l’interface devient une pile à une colonne avec en-tête de 76 px, barre basse de 72 px, liste allégée et panneau de détail plein écran; la capture rapide est une feuille basse qui respecte la safe area et défile en interne. La connexion bascule de deux colonnes à une colonne sous 780 px.

Le rythme est dense et régulier : 4–16 px à l’intérieur des contrôles, 24 px pour les plans courants et 30 px pour les séparations majeures. Aucun débordement horizontal n’est accepté entre 320 px et 1920 px.

**The Capture-First Rule.** Sur chaque format, le champ de capture, son type et son action principale restent visibles avant les outils d’organisation.

Applications connectées est une page de réglages à défilement de document : largeur maximale de (900 px), padding (36 px 32 px 64 px), formulaire à (650 px maximum) et sections séparées par un filet. Son titre condensé fait (48 px), ses titres de section (28 px). Le consentement reprend la page avec (760 px maximum) et (64 px) en tête. Sous (600 px), le cadre passe à (24 px 20 px 40 px), l’en-tête s’empile, le titre à (36 px), et création/autorisation occupent toute la largeur. Cette composition propre aux réglages ne modifie pas le poste de capture.

## Elevation & Depth

Le système est plat par défaut. La profondeur vient d’abord des différences de plans et des filets de 1 px; les ombres apparaissent seulement lorsqu’un élément flotte, reçoit le focus ou confirme un changement d’état.

### Shadow Vocabulary

- **Action basse** (`0 10px 24px rgba(106,43,21,.25)`): ombre chaude compacte sous l’action rouille pour la détacher du plan de capture.
- **Focus de capture** (`0 22px 50px rgba(6,12,18,.2)`): ombre froide et large activée par `:focus-within`, en complément du léger éclaircissement du plan.
- **Menu flottant** (`0 15px 38px rgba(0,0,0,.35)`): ombre structurelle sous le menu de compte.
- **Dialogue modal** (`0 30px 90px rgba(0,0,0,.55)`): ombre profonde associée à un backdrop sombre.
- **Toast** (`0 12px 30px rgba(0,0,0,.35)`): ombre moyenne pour séparer la confirmation du contenu.

Les boutons primaires d’Applications connectées et du consentement imposent `box-shadow: none` au repos et au survol dans `.integration-main`. Cette exception locale renforce la hiérarchie par la couleur et le chanfrein ; les ombres existantes de capture, focus, menus, dialogues et toasts sont conservées.

### Named Rules

**The Planes Before Shadows Rule.** Une surface gagne d’abord sa hiérarchie par sa teinte et son filet; l’ombre est réservée à un état temporaire ou flottant.

## Shapes

Les formes sont rectilignes et compactes. Les cases utilisent 3 px, les contrôles et champs 4–5 px, les surfaces 6–9 px et la feuille mobile 15 px sur ses coins supérieurs. Les avatars et l’action centrale mobile sont les seules formes circulaires récurrentes.

Le chanfrein double de 9 px — coin supérieur droit et coin inférieur gauche — est la signature géométrique. Il se construit par découpe, pas par rayon, et reste réservé aux actions primaires et aux choix actifs. Les pictogrammes sont des tracés fins de 20 px, avec extrémités et jointures arrondies; le cerveau linéaire est la marque, jamais une initiale encadrée.

**The Chamfer Is A Verb Rule.** Le chanfrein signale une action ou une sélection; les surfaces informatives conservent leurs coins doucement arrondis.

## Components

### Buttons

- **Shape:** l’action primaire est rectiligne avec un double chanfrein de 9 px; les actions secondaires restent transparentes ou faiblement bordées avec 4 px de rayon.
- **Primary:** fond `accent`, contenu `on-accent`, hauteur de 46–52 px et padding horizontal de 18 px; elle s’étire sur toute la largeur dans les captures mobiles.
- **Hover / Focus / Active:** passage à `accent-hover`, contour `focus` de 2 px, puis réduction à 98,5 % à l’activation; transitions de 200 ms.
- **Icon buttons:** carré de 36–42 px, fond transparent au repos et plan ardoise au survol.

### Chips

- **Type choices:** boutons de 58 px sur desktop et 44–46 px sur mobile; l’état sélectionné reçoit le contour rouille découpé et garde un centre ardoise.
- **Tags:** surface `plane-2`, filet coloré contextualisé, rayon de 5 px et padding de 8 × 10 px.

### Cards / Containers

- **Dump rows:** lignes de 57 px minimum, séparées par `line-soft`, sans carte flottante; le survol et l’état actif sont de simples variations tonales.
- **Project containers:** grille à gouttière de 1 px où le filet commun dessine les séparations; chaque élément fait au moins 78 px.
- **Thought demo:** seul conteneur éditorial élevé de la connexion, avec rayon de 6 px, filet froid et ombre ambiante.

### Inputs / Fields

- **Style:** fond ardoise intérieur, texte `ink`, filet technique, rayon de 4–5 px; le textarea de capture utilise 16 px de texte dans l’état final.
- **Focus:** bord plus clair et ombre froide, avec caret rouille; le contour clavier global reste visible sur les contrôles.
- **Error / Disabled:** les erreurs utilisent fond sombre corail, filet assourdi et texte clair; un contrôle occupé baisse à 55 % d’opacité et conserve son libellé d’état.

### Navigation

La navigation desktop utilise des lignes de 51 px avec icône, libellé et compteur. L’état actif combine un plan ardoise, un filet rouille de 1 px à gauche et une icône rouille. La tablette conserve uniquement les icônes dans un rail; le mobile expose cinq destinations avec des libellés de 11 px dans une barre fixe et élève la capture centrale circulaire au-dessus du rail.

### Capture Plane

Le titre, le textarea, les choix de type, les options repliables et l’action forment un seul plan. La saisie illumine légèrement le plan et ajoute une profondeur temporaire; les options secondaires restent cachées tant qu’elles ne sont pas demandées. Un rail de triage sombre et chanfreiné apparaît dans le bas du textarea après une courte temporisation : il présente type, destination, échéance, priorité, tags et confiance sans déplacer la composition ni prétendre que le Dump est déjà enregistré.

### Search, Dialogs and Feedback

La recherche globale est un déclencheur bordé avec rappel `⌘ K`, puis un dialogue large dont les résultats restent des lignes séparées. Les feuilles mobiles, menus, toasts, squelettes et états vides reprennent les mêmes plans mats. Les mouvements restent courts et `prefers-reduced-motion` ramène animations et transitions à 0,01 ms.

### Applications connectées et consentement

Configurer Liora associe nom d’application et URL de retour exacte dans un formulaire simple, puis Créer l’application. L’identifiant et la clé apparaissent après cette action ; la clé reste masquée dans un champ de mot de passe en lecture, affichée une seule fois, avec Copier la clé / Masquer et terminer. Le texte précise qu’une clé d’application ne donne aucun accès aux notes sans autorisation personnelle. Les champs reprennent le plan de navigation, filet de (1 px), rayon de (4 px) et padding de (12 px).

Mes applications et Accès à mes notes restent deux listes distinctes de lignes à padding vertical de (18 px), filet inférieur et destination pouvant revenir à la ligne. Changer la clé et Révoquer l’application portent sur l’application ; Retirer l’accès à mes notes porte sur l’autorisation personnelle. La rotation et la révocation demandent la confirmation existante et gardent les notes dans BrainDump. Les actions se replient avec un écart de (12 px), puis (8 px) sur mobile, et une hauteur minimale de (44 px). Succès, erreur et liste vide sont écrits ; ces comportements sont extraits des sources, sans certification exhaustive des états rendus.

Le consentement montre compte, destination, portée lecture seule et retrait futur de l’autorisation avant ses deux décisions. Autoriser la lecture des notes datées utilise le primaire local rouille, sans ombre, à chanfrein de (9 px) ; Refuser reste textuel. « Retour à BrainDump » conserve son lien vers l’accueil, sans glyphe servant d’icône. La portée exclut les tâches, notes sans date et autres types de pensées ; l’interface Liora montre la source BrainDump sans commandes d’édition ou de suppression.

## Do's and Don'ts

### Do:

- **Do** montrer la capture immédiatement et préserver sa dominance visuelle.
- **Do** structurer les collections par plans continus, filets et lignes denses.
- **Do** réserver le rouille à l’action courante, au focus actif et aux petits repères d’état.
- **Do** conserver des cibles tactiles d’au moins 42 px sur mobile et un focus clavier distinct.
- **Do** utiliser le cerveau linéaire comme marque sur les surfaces authentifiées et de connexion.
- **Do** distinguer application configurée et autorisation personnelle, avec compte, destination et lecture seule écrits avant consentement.
- **Do** conserver les primaires `integration-primary` / `integration-primary-hover` sans ombre sur les seules surfaces d’intégration.

### Don't:

- **Don't** transformer l’interface en tableau de bord SaaS ou en mosaïque de cartes flottantes.
- **Don't** introduire de gradients, verre, halos ou grosses pilules décoratives.
- **Don't** multiplier les actions rouille de poids équivalent dans une même vue.
- **Don't** utiliser le chanfrein sur les conteneurs informatifs ou les champs ordinaires.
- **Don't** masquer une action destructive, simuler une fonction absente ou faire reposer un sens sur la couleur seule.
- **Don't** assimiler la clé d’application à un accès au compte, ni proposer dans Liora l’édition des notes BrainDump.
