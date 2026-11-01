import './style.css';

const icons = {
  ball: '<circle cx="12" cy="12" r="9"/><path d="M5 5a10 10 0 0 1 0 14M19 5a10 10 0 0 0 0 14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  edit: '<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  thumb: '<path d="M7 10H3v11h4m0-11 5-8c3 0 2 5 1 7h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  book: '<path d="M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data = { skills: [] }, selected = null, query = '', busy = false, detailOpen = false;
const app = document.querySelector('#app');
app.innerHTML = `
  <header class="topbar"><div class="app-title">${icon('ball')}<h1>Tennis Trainer</h1></div><span id="summary" class="summary"></span></header>
  <main class="workspace">
    <aside class="skills-panel"><div class="panel-title"><h2>Skills <span id="skill-count"></span></h2><button class="button secondary" id="add-skill">${icon('plus')} Add skill</button></div><label class="search">${icon('search')}<input id="search" type="search" placeholder="Search skills" aria-label="Search skills" /></label><nav id="skills" aria-label="Tennis skills"></nav></aside>
    <section class="tips-panel" id="tips" aria-live="polite"><div class="loading">Loading tips...</div></section>
  </main><div id="toast" role="status"></div><dialog id="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-description"><form id="editor"><div class="dialog-heading"><h2 id="dialog-title"></h2><button type="button" class="icon-button" id="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><p id="dialog-description"></p><label id="title-label" for="title-input">Title</label><textarea id="title-input" rows="3" maxlength="500" required></textarea><p class="form-error" id="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button secondary" id="cancel-dialog">Cancel</button><button class="button" id="save-dialog" type="submit">Save</button></div></form></dialog>`;

async function request(payload) {
  const response = await fetch(`${import.meta.env.BASE_URL}api.php`, payload ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : { cache: 'no-store' });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The PHP backend is unavailable. Start the PHP server and try again.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  return result;
}
function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message; element.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => element.classList.remove('show'), 3200);
}
function render() {
  if (!data.skills.some(s => s.id === selected)) selected = data.skills[0]?.id;
  document.body.classList.toggle('detail-open', detailOpen);
  document.querySelector('#skill-count').textContent = data.skills.length;
  document.querySelector('#summary').textContent = `${data.skills.length} skills · ${data.skills.reduce((n, s) => n + s.tips.length, 0)} tips`;
  const filtered = data.skills.filter(s => s.title.toLowerCase().includes(query.toLowerCase()));
  document.querySelector('#skills').innerHTML = filtered.map(s => `<button class="skill ${s.id === selected ? 'active' : ''}" data-select="${s.id}" ${s.id === selected ? 'aria-current="true"' : ''}><span class="skill-icon">${icon('ball')}</span><span class="skill-label">${escape(s.title)}<span class="skill-subtitle">${s.tips.length} ${s.tips.length === 1 ? 'tip' : 'tips'}</span></span>${icon('arrow')}</button>`).join('') || '<p class="no-results">No skills found.</p>';
  const skill = data.skills.find(s => s.id === selected);
  const panel = document.querySelector('#tips');
  if (!skill) { panel.innerHTML = `<div class="empty-state">${icon('ball')}<h3>No skills yet</h3><p>Add a skill to start saving tips.</p><button class="button" data-action="addSkill">${icon('plus')} Add a skill</button></div>`; return; }
  const tips = [...skill.tips].sort((a, b) => b.count - a.count);
  panel.innerHTML = `<div class="detail-navigation"><button class="back-button" data-action="back">${icon('back')} Skills</button></div><div class="skill-heading"><h2>${escape(skill.title)}</h2><div class="skill-actions"><button class="icon-button" data-action="editSkill" aria-label="Edit skill">${icon('edit')}</button><button class="icon-button danger" data-action="deleteSkill" aria-label="Delete skill">${icon('trash')}</button></div></div><div class="tips-toolbar"><span>${tips.length} ${tips.length === 1 ? 'tip' : 'tips'}<span class="sort-label"> &middot; Most helpful first</span></span><button class="button" data-action="addTip">${icon('plus')} Add tip</button></div>${tips.length ? `<div class="tip-list">${tips.map(tip => `<article class="tip-card"><div class="tip-content"><h3>${escape(tip.title)}</h3><div class="tip-edit"><button class="text-button" data-action="editTip" data-tip="${tip.id}">${icon('edit')} Edit</button><button class="text-button danger" data-action="deleteTip" data-tip="${tip.id}">${icon('trash')} Delete</button></div></div><button class="vote-button" data-action="vote" data-tip="${tip.id}" aria-label="This tip helped: ${escape(tip.title)}. Count: ${tip.count}" ${busy ? 'disabled' : ''}>${icon('thumb')}<strong>${tip.count}</strong><span>Helpful</span></button></article>`).join('')}</div>` : `<div class="empty-state">${icon('book')}<h3>No tips yet</h3><p>Save a reminder or a cue for this skill.</p><button class="button secondary" data-action="addTip">${icon('plus')} Add first tip</button></div>`}`;
}
async function mutate(payload) {
  if (busy) return false;
  busy = true;
  document.querySelectorAll('.vote-button').forEach(button => button.disabled = true);
  try { data = await request(payload); return true; }
  finally { busy = false; render(); }
}
function openEditor(action, tipId) {
  const skill = data.skills.find(s => s.id === selected);
  const tip = skill?.tips.find(t => t.id === tipId);
  const deleting = action.startsWith('delete');
  const isSkill = action.endsWith('Skill');
  const item = isSkill ? skill : tip;
  const dialog = document.querySelector('#dialog');
  document.querySelector('#dialog-title').textContent = `${deleting ? 'Delete' : action.startsWith('add') ? 'Add' : 'Edit'} ${isSkill ? 'a skill' : 'a tip'}`;
  document.querySelector('#dialog-description').textContent = deleting ? `Delete “${item.title}”? ${isSkill ? 'All its tips will also be deleted. ' : ''}This cannot be undone.` : isSkill ? 'What would you like to work on?' : 'Keep it short, specific, and easy to remember on court.';
  const input = document.querySelector('#title-input');
  input.hidden = deleting; input.required = !deleting; input.value = action.startsWith('edit') ? item.title : '';
  document.querySelector('#title-label').hidden = deleting;
  const save = document.querySelector('#save-dialog');
  save.textContent = deleting ? 'Delete' : 'Save'; save.classList.toggle('destructive', deleting);
  document.querySelector('#form-error').textContent = '';
  document.querySelector('#editor').onsubmit = async event => {
    event.preventDefault();
    const value = input.value.trim();
    if (!deleting && !value) { input.focus(); return; }
    save.disabled = true;
    try {
      if (await mutate({ action, skillId: skill?.id, tipId, title: value })) {
        if (action === 'deleteSkill') { detailOpen = false; history.replaceState(null, ''); render(); }
        if (action === 'addSkill') { showDetail(); selected = data.skills.at(-1).id; query = ''; document.querySelector('#search').value = ''; render(); }
        dialog.close(); toast(deleting ? 'Deleted' : 'Saved');
      }
    } catch (error) { document.querySelector('#form-error').textContent = error.message; }
    finally { save.disabled = false; }
  };
  dialog.showModal();
  if (!deleting) input.focus();
}
document.querySelector('#add-skill').onclick = () => openEditor('addSkill');
document.querySelector('#search').oninput = event => { query = event.target.value; render(); };
document.querySelector('#skills').onclick = event => { const button = event.target.closest('[data-select]'); if (button) { selected = button.dataset.select; showDetail(); render(); } };
document.querySelector('#tips').onclick = async event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const { action, tip } = button.dataset;
  if (action === 'back') {
    if (history.state?.tennisDetail) history.back();
    else { detailOpen = false; render(); }
    return;
  }
  if (action === 'vote') {
    try { if (await mutate({ action, skillId: selected, tipId: tip })) toast('Helpful count updated'); }
    catch (error) { toast(error.message); }
  } else openEditor(action, tip);
};
for (const id of ['close-dialog', 'cancel-dialog']) document.getElementById(id).onclick = () => document.querySelector('#dialog').close();
function showDetail() {
  if (matchMedia('(max-width: 700px)').matches) {
    if (!detailOpen) history.pushState({ tennisDetail: true }, '');
    window.scrollTo(0, 0);
  }
  detailOpen = true;
}
window.addEventListener('popstate', event => { detailOpen = Boolean(event.state?.tennisDetail); render(); });
history.replaceState(null, '');
async function load() {
  try { data = await request(); render(); }
  catch (error) { document.body.classList.add('detail-open'); document.querySelector('#tips').innerHTML = `<div class="empty-state"><h3>Unable to load tips</h3><p>${escape(error.message)}</p><button class="button" id="retry">Try again</button></div>`; document.querySelector('#retry').onclick = load; }
}
load();
