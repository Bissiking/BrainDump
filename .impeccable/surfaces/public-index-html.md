---
version: 1
slug: "public-index-html"
primary_target: "views/index.html"
related_targets: ["views/login.html"]
approved_comp: ".impeccable/mocks/v2-capture-home.png"
---

# BrainDump workspace and login

## Scope and mode

Operate. Covers `views/index.html` and the related authenticated entry surface `views/login.html`.

## Audience and job

The primary user captures a thought in seconds, optionally checks the automatic classification, saves it, and calmly reviews recent notes. Authentication must make the boundary between signed-out and signed-in states obvious.

## Primary actions and content

- Sign in through Kyros.
- Capture, analyze, and save a free-form note.
- Scan type, priority, project, date, tags, and confidence.
- Delete a note through an explicit confirmation.
- Sign out from a compact account menu.

## Chosen direction

Dark precisionist workbench: flat blue-gray planes, hard directional hierarchy, and a restrained rust-orange action accent. Approved composition: `.impeccable/mocks/v2-capture-home.png`. The memorable moment is a dominant capture plane that lets the user write first and reveal organization only afterward.

## Composition and implementation inventory

| Visible ingredient | Commitment | Medium |
| --- | --- | --- |
| Minimal top bar | BrainDump left, note count near center, account menu right | Semantic HTML/CSS |
| Centered canvas | One constrained reading column with generous outer whitespace | CSS Grid |
| Capture strip | Compact prompt expands to a textarea with analysis and actions | Semantic HTML/CSS/JS |
| Analysis preview | Inline type, priority, project, due date, confidence | Semantic HTML/CSS/JS |
| Note collection | Two airy columns on wide screens, one ordered column on narrow screens | CSS Grid |
| Contextual deletion | Low-emphasis icon/button, explicit confirmation before mutation | HTML/CSS/JS |
| Login surface | Same centered canvas and product typography, one primary Kyros action | Semantic HTML/CSS |
| Icons | Small exact line icons for brand, session, analysis, save, metadata, delete | Local Papicons/Lucide sprite; historical brand paths preserved |
| Motion | Composer expansion and status feedback only; reduced-motion fallback | CSS transitions |

## Constraints

No new runtime dependency, no invented marketing proof, no decorative raster imagery, and no persistent sidebar while only one workspace view exists. Mobile collapses to one column and keeps the primary action reachable.


## Extension 2.2.0

The current multi-view native workspace is retained. Settings groups account,
optional personal triage and connected applications under `/#settings`.
Responsive captures offer project, tags, due date and independent reference
date. Filters and navigation persist in the URL. Local SVG catalog and license
inventory: `DOCS/ICONS.md`. The existing sidebar remains the collection navigation;
settings are reached through its account footer. Evidence: `DOCS/V2.2.0.md`.
