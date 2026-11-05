export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);
export function localDateValue(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export const apiDateValue = value => value ? new Date(value).toISOString() : null;
export const parseTags = value => [...new Set(value.split(',').map(tag => tag.trim().toLocaleLowerCase('fr')).filter(Boolean))].slice(0, 12);
export function formatDate(value, {time = false} = {}) {
  if (!value) return '';
  return new Intl.DateTimeFormat('fr-FR', {day:'numeric', month:'short', hour:time?'2-digit':undefined, minute:time?'2-digit':undefined}).format(new Date(value));
}
export const typeLabels = {note:'Note', task:'Tâche', idea:'Idée', bug:'Bug', reminder:'Rappel'};
export const statusLabels = {inbox:'Inbox', todo:'À faire', in_progress:'En cours', done:'Terminé', cancelled:'Annulé'};
export const priorityLabels = {low:'Basse', normal:'Normale', high:'Haute', urgent:'Urgente'};
export const typeIcons = {note:'note', task:'check', idea:'idea', bug:'bug', reminder:'bell'};
export const titleFor = dump => dump.title || dump.content.split('\n')[0].slice(0, 100) || 'Sans titre';
export function fillSelect(select, labels, value = '', placeholder) {
  select.innerHTML = (placeholder ? `<option value="">${placeholder}</option>` : '') + Object.entries(labels).map(([key, label]) => `<option value="${key}">${escapeHtml(label)}</option>`).join('');
  select.value = value;
}
