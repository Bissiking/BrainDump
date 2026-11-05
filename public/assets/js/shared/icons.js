// Generated semantic icon registry. Edit resources/icons/catalog.json and run npm run icons:build.
const names = new Set(["home","inbox","calendar","check","note","idea","bug","bell","folder","archive","search","tag","star","trash","more","paperclip","lock","settings","undo","edit","logout","link","sparkles","arrow","plus","close","chevron","brain"]);
export function icon(name) {
  name = name.replace(/^i-/, '');
  if (!names.has(name)) throw new Error('Icône inconnue : ' + name);
  return '<svg class="icon" aria-hidden="true" focusable="false"><use href="/assets/icons/sprite.svg#i-' + name + '"/></svg>';
}
