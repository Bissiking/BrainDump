# Icônes BrainDump

Le catalogue `resources/icons/catalog.json` associe un nom sémantique à un seul SVG
local et enregistre sa provenance exacte (URL et commit amont). Aucun CDN,
police d'icônes, paquet d'icônes complet ou framework n'est chargé au runtime.

- [Papicons](https://github.com/PapillonApp/Papicons) a été examiné en priorité.
  `add`, `cross` et `chevron-right` conviennent aux commandes simples. La plupart
  des autres pictogrammes Papicons sont pleins et plus lourds que l'iconographie
  de BrainDump ; ils ne sont pas forcés dans les vues de contenu.
- [Lucide](https://github.com/lucide-icons/lucide) fournit les pictogrammes de
  contour pour navigation, types, métadonnées, réglages et actions restantes.
- Tabler et Phosphor n'ont pas été ajoutés : aucun besoin supplémentaire ne
  justifie leur import dans cette sélection.

## Utilisation

```html
<svg class="icon" aria-hidden="true" focusable="false">
  <use href="/assets/icons/sprite.svg#i-calendar"/>
</svg>
```

```js
import { icon } from '/assets/js/shared/icons.js';
button.innerHTML = icon('archive') + '<span>Archiver</span>';
```

Le bouton porte le texte ou `aria-label`. Les SVG sont décoratifs, non focalisables,
et ne portent jamais seuls l'état actif. Ne pas fournir de nom provenant de
contenu utilisateur : `icon()` valide les noms contre le catalogue généré.

## Remplacer ou ajouter

1. Choisir une icône adaptée à la fonction, Papicons en premier examen, en
   conservant la silhouette et la lisibilité du groupe existant.
2. Copier uniquement le SVG nécessaire dans `resources/icons/sources/<bibliothèque>`.
3. Ajouter/adapter son entrée sémantique dans `catalog.json` avec sa provenance
   épinglée et la licence complète dans `resources/icons/licenses`.
4. Exécuter `npm run icons:build` (génération entièrement hors ligne).
5. Vérifier desktop et mobile avec `npm run visual:qa`.

`public/assets/js/shared/icons.js`, `public/assets/icons/sprite.svg` et les copies
de licences dans `public/assets/icons/licenses/` sont générés ; ne pas les modifier
directement. Les fichiers de référence restent dans `resources/icons/`.
La grille est de 24 × 24, la taille courante de 20 px, le contour de 1,8 unité et
la couleur `currentColor`. Les exceptions optiques de Papicons sont explicites
(`scale: 0.7`) : leurs tracés pleins sont conservés sans faux contour additionnel.
Les métadonnées utilisent 13–16 px, les choix de type 20–22 px. `--icon-size` et
`--icon-stroke` définissent les valeurs par défaut dans `style.css` ; les symboles
Lucide appliquent 1,8 pour une épaisseur identique dans les trois pages.

Le cerveau `i-brain` reprend exactement les tracés historiques de BrainDump à
32 × 32. `logo.svg`, `favicon.svg` et les favicons bitmap restent inchangés.
Le logo de la connexion conserve son SVG historique.

## Licences distribuées

- Papicons : MIT, copyright Association Papillon, texte intégral dans
  `resources/icons/licenses/papicons.txt`.
- Lucide : ISC et MIT pour les icônes dérivées de Feather, texte intégral et liste
  amont dans `resources/icons/licenses/lucide.txt`.

Conserver ces deux textes lors de la redistribution des SVG, y compris du sprite.
Le générateur copie les licences dans `public/assets/icons/licenses/` pour les
distribuer avec les SVG servis au navigateur.
Les normalisations du sprite sont limitées au conteneur, à `currentColor`, à
l'épaisseur et à l'ajustement optique documenté ; les SVG sources sont conservés.
