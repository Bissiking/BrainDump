import { apiRequest, logout, requireSession } from '../shared/auth.js';
import { icon } from '../shared/icons.js';
import { $, $$, escapeHtml, localDateValue, apiDateValue, parseTags, formatDate, typeLabels, statusLabels, priorityLabels, typeIcons, titleFor, fillSelect } from '../shared/ui.js';

const viewConfig = {
  home:{title:'Accueil',subtitle:'Un endroit net pour ce qui te traverse.'},
  inbox:{title:'Inbox',subtitle:'Capture maintenant, range ensuite.'},
  today:{title:'Aujourd’hui',subtitle:'Les échéances et les priorités du jour.'},
  tasks:{title:'Tâches',subtitle:'Ce qui mérite une prochaine action.'},
  notes:{title:'Notes',subtitle:'Les informations que tu veux garder.'},
  ideas:{title:'Idées',subtitle:'Des pistes à laisser grandir.'},
  bugs:{title:'Bugs',subtitle:'Les accrocs à corriger sans les oublier.'},
  reminders:{title:'Rappels',subtitle:'Ce qui doit revenir au bon moment.'},
  projects:{title:'Projets & tags',subtitle:'Juste assez de structure pour retrouver les choses.'},
  archives:{title:'Archives',subtitle:'Hors de vue, jamais perdu.'},
  settings:{title:'Paramètres',subtitle:'Votre configuration, au même endroit.'},
  more:{title:'Plus',subtitle:'Tous tes espaces BrainDump.'}
};
const typeByView = {tasks:'task',notes:'note',ideas:'idea',bugs:'bug',reminders:'reminder'};
const filterKeys = ['search','type','status','project','tag','priority','date-field','from','to','favorite'];
const state = {view:'home', dumps:[], projects:[], tags:[], today:null, user:null, selectedId:null, detail:null, captureType:null, mobileType:null};
let listController, listSequence = 0, searchController, detailSequence = 0, filterTimer, searchTimer;
let pendingSave = null, saveTimer, saveChain = Promise.resolve(), savingCount = 0;
const triageTimers = new WeakMap(), triageControllers = new WeakMap();
const mutations = new Map();

function toast(message, tone = 'success', undo) {
  const node = document.createElement('div'); node.className = `toast ${tone}`;
  const text = document.createElement('span'); text.textContent = message; node.append(text);
  let timeout;
  if (undo) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Annuler';
    button.addEventListener('click', async () => {
      clearTimeout(timeout); button.disabled = true;
      try { await undo(); node.remove(); } catch (error) { button.disabled = false; toast(error.message, 'error'); }
    });
    node.append(button);
    node.addEventListener('focusin', () => clearTimeout(timeout));
    node.addEventListener('pointerenter', () => clearTimeout(timeout));
  }
  $('#toast-region').append(node);
  timeout = setTimeout(() => node.remove(), undo ? 10000 : 6000);
}
function report(error) { if (error.name !== 'AbortError') toast(error.message || 'Impossible de terminer cette action.', 'error'); }
function busy(button, active) { button.disabled = active; button.setAttribute('aria-busy', String(active)); }
function metadata(dump) {
  const values = [`<span>${icon(typeIcons[dump.type])}${typeLabels[dump.type]}</span>`];
  if (dump.project) values.push(`<span>${icon('folder')}${escapeHtml(dump.project.name)}</span>`);
  for (const tag of dump.tags.slice(0, 3)) values.push(`<button class="metadata-tag" data-tag-filter="${escapeHtml(tag.name)}" aria-label="Filtrer sur le tag ${escapeHtml(tag.name)}">${icon('tag')}${escapeHtml(tag.name)}</button>`);
  if (dump.priority !== 'normal') values.push(`<span class="priority-${dump.priority}">Priorité ${escapeHtml(priorityLabels[dump.priority].toLowerCase())}</span>`);
  return values.join('');
}
function renderRows(dumps) {
  if (!dumps.length) return `<div class="empty-state">${icon('inbox')}<h3>Aucune pensée dans cette vue.</h3><p>Modifie les filtres ou capture une nouvelle pensée.</p></div>`;
  return dumps.map(dump => `<article class="dump-row ${state.selectedId === dump.id ? 'active' : ''}" data-id="${dump.id}">
    ${dump.type === 'task' ? `<button class="complete-button ${dump.status === 'done' ? 'done' : ''}" data-complete="${dump.id}" aria-label="${dump.status === 'done' ? 'Rouvrir la tâche' : 'Marquer comme terminé'}" aria-pressed="${dump.status === 'done'}">${icon('check')}</button>` : `<span class="row-type">${icon(typeIcons[dump.type])}</span>`}
    <div class="dump-main"><button class="dump-open" data-open="${dump.id}"><strong class="dump-title">${escapeHtml(titleFor(dump))}</strong></button><div class="dump-meta">${metadata(dump)}</div></div>
    <time class="dump-time" datetime="${escapeHtml(dump.dueAt || dump.updatedAt)}" title="${dump.dueAt ? 'Échéance' : 'Modification'}">${formatDate(dump.dueAt || dump.updatedAt,{time:Boolean(dump.dueAt)})}</time>
    <div class="row-actions"><button class="icon-button ${dump.favorite ? 'favorite-on' : ''}" data-favorite="${dump.id}" aria-label="${dump.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}" aria-pressed="${dump.favorite}">${icon('star')}</button><details class="row-menu"><summary aria-label="Actions pour ${escapeHtml(titleFor(dump))}">${icon('more')}</summary><div>
      <button data-open="${dump.id}">${icon('edit')}Modifier</button>
      <button data-archive="${dump.id}">${icon('archive')}${dump.archivedAt ? 'Désarchiver' : 'Archiver'}</button>
      <label>Changer le type<select data-row-type="${dump.id}">${Object.entries(typeLabels).map(([type,label])=>`<option value="${type}" ${type === dump.type ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
    </div></details></div>
  </article>`).join('');
}
function wireRows(root) {
  $$('[data-open]', root).forEach(button => button.addEventListener('click', () => openDump(Number(button.dataset.open))));
  $$('[data-complete]', root).forEach(button => button.addEventListener('click', () => {
    const dump = state.dumps.find(item => item.id === Number(button.dataset.complete));
    if (dump) changeDump(dump.id, {status:dump.status === 'done' ? 'todo' : 'done'}, 'Statut de la tâche modifié.').catch(report);
  }));
  $$('[data-favorite]', root).forEach(button => button.addEventListener('click', () => {
    const dump = state.dumps.find(item => item.id === Number(button.dataset.favorite));
    if (dump) changeDump(dump.id, {favorite:!dump.favorite}, dump.favorite ? 'Favori retiré.' : 'Favori ajouté.').catch(report);
  }));
  $$('[data-archive]', root).forEach(button => button.addEventListener('click', () => {
    const dump = state.dumps.find(item => item.id === Number(button.dataset.archive));
    if (dump) changeDump(dump.id, {archivedAt:dump.archivedAt ? null : new Date().toISOString()}, dump.archivedAt ? 'Pensée désarchivée.' : 'Pensée archivée.').catch(report);
  }));
  $$('[data-row-type]', root).forEach(select => select.addEventListener('change', () => changeDump(Number(select.dataset.rowType), {type:select.value}, 'Type modifié.').catch(report)));
  $$('[data-tag-filter]', root).forEach(button => button.addEventListener('click', () => loadTag(button.dataset.tagFilter)));
}
function renderList(dumps, title, countLabel) {
  state.dumps = dumps; $('#content-title').textContent = title;
  $('#content-count').textContent = countLabel ?? `${dumps.length} élément${dumps.length > 1 ? 's' : ''}${dumps.length >= 500 ? ' · limite atteinte, affinez les filtres' : ''}`;
  $('#dump-list').innerHTML = renderRows(dumps); $('#dump-list').setAttribute('aria-busy','false'); wireRows($('#dump-list'));
}
function renderTodaySummary(today) {
  const groups = [{title:'En retard',items:today.overdue.slice(0,3)},{title:'À faire aujourd’hui',items:today.today.slice(0,4)},{title:'Important',items:today.important.slice(0,3)}].filter(group=>group.items.length);
  $('#today-summary').innerHTML = groups.length ? groups.map(group=>`<section class="today-group"><h3>${group.title}<strong>${group.items.length}</strong></h3>${group.items.map(dump=>`<div class="today-row">${icon(typeIcons[dump.type])}<button data-open="${dump.id}">${escapeHtml(titleFor(dump))}</button><time>${formatDate(dump.dueAt,{time:true})}</time></div>`).join('')}</section>`).join('') + '<button class="today-link" data-view="today">Voir tout aujourd’hui</button>' : '<div class="empty-state"><h3>Rien ne presse.</h3><p>Les échéances et rappels du jour apparaîtront ici.</p></div>';
  wireRows($('#today-summary')); wireViewButtons($('#today-summary'));
}
async function refreshSummary() {
  const [today, inbox] = await Promise.all([apiRequest('/api/today'),apiRequest('/api/dumps?status=inbox&limit=500')]);
  state.today = today; renderTodaySummary(today); $('#inbox-count').textContent = `${inbox.length}${inbox.length === 500 ? '+' : ''}`;
}
async function loadReferenceData() {
  [state.projects, state.tags] = await Promise.all([apiRequest('/api/projects'),apiRequest('/api/tags')]);
  for (const id of ['capture-project','mobile-project','detail-project','filter-project']) {
    const select = $(`#${id}`), current = select.value;
    const capture = id === 'capture-project' || id === 'mobile-project';
    select.innerHTML = `<option value="">${capture ? 'Automatique' : id === 'filter-project' ? 'Tous les projets' : 'Aucun'}</option>${capture ? '<option value="none">Aucun</option>' : ''}` + state.projects.filter(project=>project.status === 'active' || id === 'filter-project' || (id === 'detail-project' && project.id === state.detail?.projectId)).map(project=>`<option value="${project.id}">${escapeHtml(project.name)}</option>`).join('');
    select.value = current;
  }
  const current = $('#filter-tag').value;
  $('#filter-tag').innerHTML = '<option value="">Tous les tags</option>' + state.tags.map(tag=>`<option value="${escapeHtml(tag.name)}">${escapeHtml(tag.name)}</option>`).join('');
  $('#filter-tag').value = current;
  renderTagSuggestions('');
}
function renderTagSuggestions(value) {
  const parts = value.split(','); parts.pop(); const prefix = parts.length ? parts.join(',').trim() + ', ' : '';
  const existing = parseTags(value);
  $('#known-tags').innerHTML = state.tags.filter(tag=>!existing.includes(tag.name)).map(tag=>`<option value="${escapeHtml(prefix+tag.name)}"></option>`).join('');
}
function tagEditor(input) {
  const chips = document.createElement('div'); chips.className = 'tag-chips'; input.after(chips);
  const render = () => { chips.innerHTML = parseTags(input.value).map(tag=>`<button type="button" data-remove-tag="${escapeHtml(tag)}" aria-label="Retirer le tag ${escapeHtml(tag)}">${icon('tag')}${escapeHtml(tag)}${icon('close')}</button>`).join('');
    $$('[data-remove-tag]',chips).forEach(button=>button.addEventListener('click',()=>{input.value=parseTags(input.value).filter(tag=>tag !== button.dataset.removeTag).join(', ');input.dispatchEvent(new Event('input',{bubbles:true}));}));
  };
  input.addEventListener('input',()=>{input.dataset.edited='true';render();renderTagSuggestions(input.value)});input.addEventListener('focus',()=>{render();renderTagSuggestions(input.value)});return render;
}
const renderTagEditors = ['capture-tags','mobile-tags','detail-tags'].map(id=>tagEditor($(`#${id}`)));
function filterValues() {
  const query = new URLSearchParams();
  for (const key of filterKeys) {const field=$(`#filter-${key}`);const value=field.type==='checkbox'?(field.checked?'true':''):field.value.trim();if(value)query.set(key,value);}
  if (!query.has('from') && !query.has('to')) query.delete('date-field');
  return query;
}
function updateFilterState() {
  const values=filterValues(); let count=[...values.keys()].filter(key=>key!=='date-field').length;
  $('#filter-count').textContent=count?`${count} filtre${count>1?'s':''} actif${count>1?'s':''}`:'Aucun filtre actif';
  $('#reset-filters').disabled=!count;
  $('#filter-to').min=$('#filter-from').value;
  return values;
}
function readRoute() {
  const [view, query='']=location.hash.slice(1).split('?');
  return {view:view in viewConfig?view:'home',query:new URLSearchParams(query)};
}
function writeRoute(view=state.view) {const values=filterValues().toString();history.replaceState(null,'',`#${view}${values?'?'+values:''}`);}
function restoreFilters(query) {
  $('#filters').reset();
  for(const key of filterKeys){const field=$(`#filter-${key}`);if(query.has(key)){if(field.type==='checkbox')field.checked=query.get(key)==='true';else field.value=query.get(key);}}
  if(['project','tag','priority','from','to','favorite'].some(key=>query.has(key)))$('#secondary-filters').open=true;
  updateFilterState();
}
function queryForView() {
  const values=updateFilterState(), query=new URLSearchParams({limit:'500'});
  for (const key of ['search','type','status','tag','priority','favorite']) if(values.has(key))query.set(key,values.get(key));
  if(values.has('project'))query.set('projectId',values.get('project'));
  if(typeByView[state.view])query.set('type',typeByView[state.view]);
  if(state.view==='inbox')query.set('status','inbox');
  if(state.view==='archives')query.set('status','archived');
  if(values.has('from')||values.has('to'))query.set('dateField',values.get('date-field')||'dueAt');
  if(values.has('from'))query.set('from',new Date(values.get('from')+'T00:00:00').toISOString());
  if(values.has('to'))query.set('to',new Date(values.get('to')+'T23:59:59.999').toISOString());
  return query;
}
async function loadView(view=state.view) {
  listController?.abort(); listController=new AbortController(); const {signal}=listController; const sequence=++listSequence;
  state.view=view in viewConfig?view:'home'; const config=viewConfig[state.view];
  $('#view-title').textContent=config.title;$('#view-subtitle').textContent=config.subtitle;document.title=`${config.title} · BrainDump`;
  $$('[data-view]').forEach(item=>{item.classList.toggle('active',item.dataset.view===state.view);if(item.dataset.view===state.view)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current')});
  $('#capture-plane').hidden=state.view!=='home';$('#main').classList.toggle('view-list',state.view!=='home');
  $('.app-shell').classList.toggle('settings-open',state.view==='settings');
  $('#view-all').hidden=state.view!=='home';$('#filters').hidden=['projects','more','settings'].includes(state.view);
  $('#filter-type').disabled=Boolean(typeByView[state.view]);if(typeByView[state.view])$('#filter-type').value=typeByView[state.view];
  $('#filter-status').disabled=['inbox','archives'].includes(state.view);if(['inbox','archives'].includes(state.view))$('#filter-status').value=state.view==='inbox'?'inbox':'archived';
  $('#dump-list').setAttribute('aria-busy','true');
  try {
    if(state.view==='projects'){renderProjects();return;}
    if(state.view==='more'){renderMore();return;}
    if(state.view==='settings'){await renderSettings(signal,sequence);return;}
    const query=queryForView();
    const dumps=await apiRequest(`/api/dumps?${query}`,{signal});
    if(sequence!==listSequence)return;
    let filtered=dumps;
    if(state.view==='today'){
      const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);
      filtered=dumps.filter(dump=>!['done','cancelled'].includes(dump.status)&&((dump.dueAt&&dump.dueAt<end.toISOString())||dump.favorite||['high','urgent'].includes(dump.priority)));
    }
    renderList(filtered,config.title==='Accueil'?'À reprendre':config.title);
    updateFilterState();
  } catch(error) {
    if(error.name==='AbortError'||sequence!==listSequence)return;
    $('#dump-list').innerHTML=`<div class="empty-state">${icon('inbox')}<h3>Impossible de charger cette vue.</h3><p>${escapeHtml(error.message)}</p><button id="retry-view" class="text-action" type="button">Réessayer</button></div>`;
    $('#retry-view').addEventListener('click',()=>loadView());
  } finally {if(sequence===listSequence)$('#dump-list').setAttribute('aria-busy','false');}
}

function clearTriage(node) {
  clearTimeout(triageTimers.get(node));triageControllers.get(node)?.abort();node.hidden=true;node.textContent='';
  node.parentElement.classList.remove('has-prediction');
  const mobile=node.id==='mobile-triage-preview';$$('[data-type]',$(mobile?'#mobile-types':'#type-selector')).forEach(button=>button.classList.remove('suggested'));
}
function renderTriage(node,result) {
  const type=result.suggestedType;
  node.innerHTML=`<div class="triage-heading">${icon('sparkles')}<strong>${type?`${escapeHtml(typeLabels[type])} proposée`:'Type à préciser'}</strong><span>${result.confidence}%</span></div><p>${escapeHtml(result.explanation)}</p><div class="triage-facts">${result.project?`<span>${icon('folder')}${escapeHtml(result.project)}</span>`:''}${result.dueDate?`<span>${icon('calendar')}${formatDate(result.dueDate,{time:true})}</span>`:''}${result.tags?.length?`<span>${icon('tag')}${result.tags.map(escapeHtml).join(', ')}</span>`:''}${result.priority!=='normal'?`<span>Priorité ${escapeHtml(priorityLabels[result.priority])}</span>`:''}</div>`;
  node.hidden=false;node.parentElement.classList.add('has-prediction');
  const mobile=node.id==='mobile-triage-preview';$$('[data-type]',$(mobile?'#mobile-types':'#type-selector')).forEach(button=>button.classList.toggle('suggested',button.dataset.type===type));
}
function scheduleTriage(content,node) {
  clearTriage(node);if(content.trim().length<3)return;
  triageTimers.set(node,setTimeout(async()=>{
    const controller=new AbortController();triageControllers.set(node,controller);
    try {const result=await apiRequest('/api/analyze',{method:'POST',body:JSON.stringify({content:content.trim()}),signal:controller.signal});if(!controller.signal.aborted)renderTriage(node,result);}
    catch(error){if(error.name!=='AbortError'){node.textContent='Aperçu indisponible. Tu peux choisir le type et enregistrer.';node.hidden=false;}}
  },350));
}
function selectType(type,mobile=false) {
  const key=mobile?'mobileType':'captureType';state[key]=state[key]===type?null:type;
  $$('[data-type]',$(mobile?'#mobile-types':'#type-selector')).forEach(button=>{const active=button.dataset.type===state[key];button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active))});
}
function capturePayload(mobile=false) {
  const prefix=mobile?'mobile':'capture', content=$(`#${prefix}-content`).value.trim();
  if(!content)throw new Error('Écris quelque chose avant d’enregistrer.');
  const project=$(`#${prefix}-project`).value, tags=$(`#${prefix}-tags`).value, due=$(`#${prefix}-due`).value;
  return {content,type:state[mobile?'mobileType':'captureType']||undefined,projectId:project==='none'?null:project?Number(project):undefined,tags:tags.trim()||$(`#${prefix}-tags`).dataset.edited==='true'?parseTags(tags):undefined,dueAt:$(`#${prefix}-no-due`).checked?null:due?apiDateValue(due):undefined,referenceAt:apiDateValue($(`#${prefix}-reference`).value)};
}
async function saveCapture(mobile=false) {
  const button=$(mobile?'#mobile-save':'#save-dump');if(button.disabled)return;busy(button,true);
  const prefix=mobile?'mobile':'capture';
  const payload=capturePayloadSafe(mobile);if(!payload){busy(button,false);return;}
  const fields=$$('input,textarea,select,button',$(mobile?'#mobile-capture':'#capture-plane')).map(field=>[field,field.disabled]);fields.forEach(([field])=>field.disabled=true);
  try {
    await apiRequest('/api/dumps',{method:'POST',body:JSON.stringify(payload)});
    for(const field of ['content','tags','due','reference','project'])$(`#${prefix}-${field}`).value='';
    delete $(`#${prefix}-tags`).dataset.edited;$(`#${prefix}-no-due`).checked=false;$(`#${prefix}-due`).disabled=false;clearTriage($(mobile?'#mobile-triage-preview':'#triage-preview'));
    state[mobile?'mobileType':'captureType']=null;
    $$('[data-type]',$(mobile?'#mobile-types':'#type-selector')).forEach(item=>{item.classList.remove('selected');item.setAttribute('aria-pressed','false')});
    renderTagEditors.forEach(render=>render());if(mobile)$('#mobile-capture').close();toast('Ajouté à l’Inbox.');
    await loadReferenceData();await Promise.all([loadView(),refreshSummary()]);if(!mobile)$('#capture-content').focus();
  }catch(error){report(error)}finally{fields.forEach(([field,disabled])=>field.disabled=field.id===`${prefix}-due`?$(`#${prefix}-no-due`).checked:disabled);busy(button,false)}
}
function capturePayloadSafe(mobile) {try{return capturePayload(mobile)}catch(error){report(error);return null}}

// Capture ID and payload at input time, then serialize writes even across views.
function unchangedDate(value,original) {return value===localDateValue(original)?original||null:apiDateValue(value);}
function detailPayload() {return {title:$('#detail-title').value.trim()||null,content:$('#detail-content').value,type:$('#detail-type').value,status:$('#detail-status').value,priority:$('#detail-priority').value,projectId:$('#detail-project').value?Number($('#detail-project').value):null,dueAt:unchangedDate($('#detail-due').value,state.detail?.dueAt),referenceAt:unchangedDate($('#detail-reference').value,state.detail?.referenceAt),tags:parseTags($('#detail-tags').value)};}
function scheduleSave() {
  if(!state.selectedId)return;clearTimeout(saveTimer);
  pendingSave={id:state.selectedId,payload:detailPayload()};$('#save-state').textContent='Modification…';saveTimer=setTimeout(()=>flushSave().catch(report),550);
}
async function flushSave() {
  clearTimeout(saveTimer);
  if(!pendingSave)return saveChain;
  const snapshot=pendingSave;pendingSave=null;savingCount++;
  const task=saveChain.catch(()=>{}).then(async()=>{
    if(state.selectedId===snapshot.id)$('#save-state').textContent='Enregistrement…';
    try {
      const dump=await apiRequest(`/api/dumps/${snapshot.id}`,{method:'PATCH',body:JSON.stringify(snapshot.payload)});
      if(state.selectedId===snapshot.id){state.detail=dump;$('#save-state').textContent=pendingSave?'Modification…':'Enregistré';renderDetailDates(dump)}
      state.dumps=state.dumps.map(item=>item.id===dump.id?dump:item);if(dump.tags.some(tag=>!state.tags.some(known=>known.id===tag.id)))state.referencesDirty=true;
      return dump;
    } catch(error) {
      if(state.selectedId===snapshot.id){$('#save-state').innerHTML='Échec · <button type="button" id="retry-save">Réessayer</button>';$('#retry-save').addEventListener('click',()=>{pendingSave={id:snapshot.id,payload:detailPayload()};flushSave().catch(report)});}
      throw error;
    }
  });
  const tracked=task.finally(()=>{savingCount--});saveChain=tracked;return tracked;
}
function renderDetailDates(dump) {
  $('#detail-dates').innerHTML=`<div><dt>Création</dt><dd>${formatDate(dump.createdAt,{time:true})}</dd></div><div><dt>Modification</dt><dd>${formatDate(dump.updatedAt,{time:true})}</dd></div>`;
}
function renderDetail(dump) {
  state.selectedId=dump.id;state.detail=dump;
  $('#today-context').hidden=true;$('#detail-form').hidden=false;$('#context-panel').classList.add('detail-open');
  $('#detail-title').value=dump.title||'';$('#detail-content').value=dump.content;
  fillSelect($('#detail-type'),typeLabels,dump.type);fillSelect($('#detail-status'),statusLabels,dump.status);fillSelect($('#detail-priority'),priorityLabels,dump.priority);
  const projectSelect=$('#detail-project');if(dump.projectId&&!$(`option[value="${dump.projectId}"]`,projectSelect)){const option=document.createElement('option');option.value=dump.projectId;option.textContent=dump.project?.name||'Projet archivé';projectSelect.append(option)}
  projectSelect.value=dump.projectId||'';$('#detail-due').value=localDateValue(dump.dueAt);$('#detail-reference').value=localDateValue(dump.referenceAt);
  $('#detail-tags').value=dump.tags.map(tag=>tag.name).join(', ');renderTagEditors.forEach(render=>render());
  $('#favorite-dump').classList.toggle('favorite-on',dump.favorite);$('#favorite-dump').setAttribute('aria-label',dump.favorite?'Retirer des favoris':'Ajouter aux favoris');$('#favorite-dump').setAttribute('aria-pressed',String(dump.favorite));
  $('#archive-dump span').textContent=dump.archivedAt?'Désarchiver':'Archiver';$('#save-state').textContent='Enregistré';renderDetailDates(dump);
  $('#detail-attachments').innerHTML=dump.attachments.map(attachment=>`<a href="${escapeHtml(attachment.url)}" target="_blank" rel="noopener noreferrer">${icon('paperclip')}${escapeHtml(attachment.name)}</a>`).join('');
}
async function openDump(id) {
  const sequence=++detailSequence;
  try {await flushSave();const dump=await apiRequest(`/api/dumps/${id}`);if(sequence!==detailSequence)return;renderDetail(dump);$('#detail-title').focus();}
  catch(error){report(error)}
}
async function closeDetail() {
  ++detailSequence;await flushSave();state.selectedId=null;state.detail=null;
  $('#detail-form').hidden=true;$('#today-context').hidden=false;$('#context-panel').classList.remove('detail-open');
  if(state.referencesDirty){state.referencesDirty=false;await loadReferenceData();}
}
async function changeDump(id,patch,message,allowUndo=true) {
  if(mutations.has(id))return mutations.get(id);
  const task=(async()=>{
    await flushSave();
    const before=await apiRequest(`/api/dumps/${id}`);
    const updated=await apiRequest(`/api/dumps/${id}`,{method:'PATCH',body:JSON.stringify(patch)});
    if(state.selectedId===id)renderDetail(updated);
    await Promise.all([loadView(),refreshSummary()]);
    const previous=Object.fromEntries(Object.keys(patch).map(key=>[key,before[key]]));
    toast(message,'success',allowUndo?()=>changeDump(id,previous,'Action annulée.',false):undefined);
  })();
  mutations.set(id,task);try{return await task}finally{mutations.delete(id)}
}

function renderProjects(){
  $("#dump-list").setAttribute("aria-busy","false");$("#content-title").textContent="Projets";$("#content-count").textContent=`${state.projects.length} projet${state.projects.length>1?"s":""}`;
  $("#dump-list").innerHTML=`<form class="inline-form" id="project-form"><input name="name" aria-label="Nom du nouveau projet" placeholder="Nouveau projet" maxlength="80" required><input name="color" type="color" value="#e7653b" aria-label="Couleur"><button class="primary-action" type="submit">Créer</button></form><div class="project-grid">${state.projects.map((project)=>`<button class="project-card" data-project="${project.id}" style="--project-color:${escapeHtml(project.color)}"><i class="project-color"></i><span><strong>${escapeHtml(project.name)}</strong><small>${project.dumpCount} élément${project.dumpCount>1?"s":""}</small></span>${icon("i-chevron")}</button>`).join("")}</div><header class="subsection-head"><h2>Tags</h2><p>${state.tags.length} tag${state.tags.length>1?"s":""}</p></header><form class="inline-form" id="tag-form"><input name="name" aria-label="Nom du nouveau tag" placeholder="Nouveau tag" maxlength="40" required><input name="color" type="color" value="#72819a" aria-label="Couleur"><button class="primary-action" type="submit">Créer</button></form><div class="tag-cloud">${state.tags.map((tag)=>`<span class="tag-item" style="border-color:${escapeHtml(tag.color)}66"><button data-tag-filter="${escapeHtml(tag.name)}" aria-label="Filtrer sur ${escapeHtml(tag.name)}">${icon("i-tag")}</button>${escapeHtml(tag.name)} <small>${tag.dumpCount}</small><button data-delete-tag="${tag.id}" aria-label="Supprimer ${escapeHtml(tag.name)}">${icon("i-close")}</button></span>`).join("")}</div>`;
  $("#project-form").addEventListener("submit",createProject);$("#tag-form").addEventListener("submit",createTag);$$('[data-project]').forEach((button)=>button.addEventListener("click",()=>loadProject(Number(button.dataset.project))));$$('[data-tag-filter]').forEach((button)=>button.addEventListener("click",()=>loadTag(button.dataset.tagFilter)));$$('[data-delete-tag]').forEach((button)=>button.addEventListener("click",()=>removeTag(Number(button.dataset.deleteTag))));
}
async function createProject(event){event.preventDefault();const data=new FormData(event.currentTarget);try{await apiRequest("/api/projects",{method:"POST",body:JSON.stringify({name:data.get("name"),color:data.get("color")})});toast("Projet créé.");await loadReferenceData();renderProjects()}catch(error){toast(error.message,"error")}}
async function createTag(event){event.preventDefault();const data=new FormData(event.currentTarget);try{await apiRequest("/api/tags",{method:"POST",body:JSON.stringify({name:data.get("name"),color:data.get("color")})});toast("Tag créé.");await loadReferenceData();renderProjects()}catch(error){toast(error.message,"error")}}
async function removeTag(id){if(!confirm("Supprimer ce tag ? Il sera retiré des Dumps associés."))return;try{await apiRequest(`/api/tags/${id}`,{method:"DELETE"});await loadReferenceData();renderProjects();toast("Tag supprimé.")}catch(error){toast(error.message,"error")}}

function loadProject(id) {navigate('home',new URLSearchParams({project:String(id)})).catch(report);}
function loadTag(tag) {navigate('home',new URLSearchParams({tag})).catch(report);}
function renderMore() {
  $('#content-title').textContent='Tous les espaces';$('#content-count').textContent='';
  $('#dump-list').innerHTML=`<div class="more-grid">${Object.entries(viewConfig).filter(([key])=>!['home','tasks','notes','more','inbox'].includes(key)).map(([key,value])=>`<button data-view="${key}">${key==='settings'?icon('settings'):''}${value.title}${icon('chevron')}</button>`).join('')}<button id="more-search">Rechercher${icon('search')}</button></div>`;
  $('#dump-list').setAttribute('aria-busy','false');wireViewButtons($('#dump-list'));$('#more-search').addEventListener('click',openSearch);
}
async function renderSettings(signal,sequence) {
  $('#content-title').textContent='Votre espace, vos choix';$('#content-count').textContent='Configuration personnelle';
  $('#dump-list').innerHTML='<div class="skeleton-list" aria-label="Chargement des paramètres"><i></i><i></i></div>';
  const preferences=await apiRequest('/api/preferences/triage',{signal});if(sequence!==listSequence)return;
  $('#dump-list').innerHTML=`<div class="settings-content">
    <section aria-labelledby="settings-triage"><h3 id="settings-triage">${icon('sparkles')}Triage personnel</h3><p>Le moteur fonctionne localement, sans service d’IA externe. Vos choix manuels restent prioritaires.</p>
      <label class="preference-toggle"><input id="learning-enabled" type="checkbox" ${preferences.enabled?'checked':''}><span><strong>Tenir compte de mes corrections</strong><small>Après deux choix identiques pour une formulation proche, proposer ce type à nouveau. Aucune pensée existante ne sera reclassée.</small></span></label>
      <p id="learning-count">${preferences.patterns} association${preferences.patterns>1?'s':''} mémorisée${preferences.patterns>1?'s':''} sur ce serveur, pour votre compte uniquement.</p>
      <button id="reset-learning" class="secondary-action" type="button">${icon('undo')}Réinitialiser le triage personnel</button><p class="setting-hint">La réinitialisation efface les associations et désactive l’apprentissage. Les pensées restent intactes.</p>
    </section>
    <section aria-labelledby="settings-apps"><h3 id="settings-apps">${icon('link')}Applications connectées</h3><p>Configurer Liora et gérer les autorisations personnelles de lecture de vos notes datées.</p><a class="secondary-action" href="/integrations">Gérer les applications et les accès ${icon('arrow')}</a></section>
    <section aria-labelledby="settings-account"><h3 id="settings-account">${icon('lock')}Compte et session</h3><p><strong>${escapeHtml(state.user.displayName||state.user.username)}</strong><br>@${escapeHtml(state.user.username)} · Connexion sécurisée par Kyros SSO V4</p><button id="logout" class="secondary-action danger-action" type="button">${icon('logout')}Se déconnecter</button></section>
    <p class="settings-version">BrainDump 2.2.0 · Smart & Simple</p>
  </div>`;
  $('#learning-enabled').addEventListener('change',async(event)=>{
    const input=event.currentTarget,enabled=input.checked;input.disabled=true;
    try {await apiRequest('/api/preferences/triage',{method:'PATCH',body:JSON.stringify({enabled})});toast(enabled?'Triage personnel activé.':'Triage personnel désactivé.');}
    catch(error){input.checked=!enabled;report(error)}finally{input.disabled=false}
  });
  $('#reset-learning').addEventListener('click',async(event)=>{
    if(!confirm('Effacer vos associations de triage et désactiver l’apprentissage ? Vos pensées seront conservées.'))return;
    const button=event.currentTarget;busy(button,true);$('#learning-enabled').disabled=true;
    try {await apiRequest('/api/preferences/triage',{method:'DELETE'});await loadView('settings');toast('Triage personnel réinitialisé.');}
    catch(error){report(error);busy(button,false);$('#learning-enabled').disabled=false}
  });
  $('#logout').addEventListener('click',async(event)=>{const button=event.currentTarget;busy(button,true);try{await flushSave();await logout()}catch(error){report(error);busy(button,false)}});
}
async function search(value) {
  searchController?.abort();searchController=new AbortController();const {signal}=searchController;
  if(value.trim().length<2){$('#search-results').innerHTML='<p>Écris au moins deux caractères.</p>';return;}
  try {
    const results=await apiRequest(`/api/dumps?search=${encodeURIComponent(value.trim())}&limit=30`,{signal});if(signal.aborted)return;
    $('#search-results').innerHTML=results.length?results.map(dump=>`<button class="search-result" data-search-open="${dump.id}">${icon(typeIcons[dump.type])}<span><strong>${escapeHtml(titleFor(dump))}</strong><small>${dump.project?escapeHtml(dump.project.name):typeLabels[dump.type]}</small></span><small>${formatDate(dump.updatedAt)}</small></button>`).join(''):'<p>Aucun résultat. Essaie un autre mot.</p>';
    $$('[data-search-open]').forEach(button=>button.addEventListener('click',async()=>{$('#search-dialog').close();if(state.view==='settings')await navigate('home');openDump(Number(button.dataset.searchOpen));}));
  }catch(error){if(error.name!=='AbortError')$('#search-results').innerHTML=`<p>${escapeHtml(error.message)}</p>`;}
}
function openSearch() {if(!$('#search-dialog').open){$('#search-dialog').showModal();$('#global-search').focus();}}
function wireViewButtons(root=document) {$$('[data-view]',root).forEach(button=>button.addEventListener('click',event=>{event.preventDefault();navigate(button.dataset.view).catch(report)}));}
async function navigate(view,query=new URLSearchParams()) {
  clearTimeout(filterTimer);await closeDetail();restoreFilters(query);await loadView(view);writeRoute();
}
function applyFilters() {
  clearTimeout(filterTimer);
  if(!$('#filters').reportValidity())return;
  updateFilterState();writeRoute();loadView().catch(report);
}
for(const [id,labels,placeholder] of [['type',typeLabels,'Tous les types'],['status',{...statusLabels,active:'En cours ou à faire',archived:'Archivés'},'Tous les statuts'],['priority',priorityLabels,'Toutes les priorités']])fillSelect($(`#filter-${id}`),labels,'',placeholder);
$('#filters').addEventListener('submit',event=>{event.preventDefault();applyFilters()});
$('#filters').addEventListener('input',event=>{clearTimeout(filterTimer);filterTimer=setTimeout(applyFilters,event.target.type==='search'?250:120)});
$('#reset-filters').addEventListener('click',()=>{restoreFilters(new URLSearchParams());applyFilters()});
for(const mobile of [false,true]) {
  const prefix=mobile?'mobile':'capture',container=$(mobile?'#mobile-types':'#type-selector');
  $$('[data-type]',container).forEach(button=>{button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>selectType(button.dataset.type,mobile))});
  $(`#${prefix}-content`).addEventListener('input',event=>scheduleTriage(event.target.value,$(mobile?'#mobile-triage-preview':'#triage-preview')));
  $(`#${prefix}-content`).addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){event.preventDefault();saveCapture(mobile)}});
  $(`#${prefix}-no-due`).addEventListener('change',event=>{$(`#${prefix}-due`).disabled=event.target.checked});
}
$('#options-toggle').addEventListener('click',()=>{const open=$('#options-toggle').getAttribute('aria-expanded')!=='true';$('#options-toggle').setAttribute('aria-expanded',String(open));$('#capture-fields').classList.toggle('open',open)});
$('#save-dump').addEventListener('click',()=>saveCapture());$('#mobile-save').addEventListener('click',()=>saveCapture(true));
$('#mobile-add').addEventListener('click',()=>{if(!$('#mobile-capture').open){$('#mobile-capture').showModal();$('#mobile-content').focus();}});
$('#view-all').addEventListener('click',()=>navigate('inbox').catch(report));
$('#close-detail').addEventListener('click',async()=>{try{await closeDetail();await Promise.all([loadView(),refreshSummary()])}catch(error){report(error)}});
$('#detail-form').addEventListener('submit',event=>event.preventDefault());
$$('input,textarea,select',$('#detail-form')).forEach(field=>field.addEventListener('input',scheduleSave));
$('#favorite-dump').addEventListener('click',()=>{if(state.detail)changeDump(state.detail.id,{favorite:!state.detail.favorite},'Favori modifié.').catch(report)});
$('#archive-dump').addEventListener('click',()=>{if(state.detail)changeDump(state.detail.id,{archivedAt:state.detail.archivedAt?null:new Date().toISOString()},state.detail.archivedAt?'Pensée désarchivée.':'Pensée archivée.').catch(report)});
$('#delete-dump').addEventListener('click',async(event)=>{
  if(!state.selectedId||!confirm('Supprimer définitivement cette pensée ?'))return;
  const button=event.currentTarget;busy(button,true);
  try{await flushSave();await apiRequest(`/api/dumps/${state.selectedId}`,{method:'DELETE'});await closeDetail();await Promise.all([loadView(),refreshSummary()]);toast('Pensée supprimée.');}catch(error){report(error)}finally{busy(button,false)}
});
$('#open-search').addEventListener('click',openSearch);
$('#global-search').addEventListener('input',event=>{searchController?.abort();clearTimeout(searchTimer);const value=event.target.value;searchTimer=setTimeout(()=>search(value),200)});
$('#search-dialog').addEventListener('close',()=>{clearTimeout(searchTimer);searchController?.abort()});
$('#dump-list').addEventListener('click',event=>{const open=event.target.closest('.row-menu');$$('.row-menu[open]').forEach(menu=>{if(menu!==open)menu.open=false})});
window.addEventListener('hashchange',()=>{const route=readRoute();navigate(route.view,route.query).catch(report)});
window.addEventListener('beforeunload',event=>{if(pendingSave||savingCount){event.preventDefault();event.returnValue='';}});
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openSearch()}if(event.key==='Escape'&&state.selectedId&&!$('dialog[open]'))closeDetail().then(()=>loadView()).catch(report)});
wireViewButtons();
try {
  const user=await requireSession();if(user){state.user=user;const name=user.displayName||user.username;$('#user-name').textContent=name;$('#user-avatar').textContent=name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();await loadReferenceData();const route=readRoute();restoreFilters(route.query);await Promise.all([loadView(route.view),refreshSummary()]);}
} catch(error) {report(error);$('#dump-list').setAttribute('aria-busy','false');$('#dump-list').innerHTML=`<div class="empty-state"><h3>Votre espace n’a pas pu se charger.</h3><p>${escapeHtml(error.message)}</p><button id="retry-start" class="secondary-action" type="button">Recharger BrainDump</button></div>`;$('#retry-start').addEventListener('click',()=>location.reload());}
if(window.visualViewport){const syncViewport=()=>{document.documentElement.style.setProperty('--visual-height',`${window.visualViewport.height}px`)};window.visualViewport.addEventListener('resize',syncViewport);syncViewport();}
