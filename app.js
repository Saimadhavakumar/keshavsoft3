const STORAGE_KEY = 'taskflow.tasks'

/* Utilities */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6)
const qs = (sel, root=document) => root.querySelector(sel)
const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel))

/* API */
const API = {
  async getTasks(){
    const res = await fetch('/api/tasks'); if(!res.ok) throw new Error('failed');
    return res.json();
  },
  async getTask(id){
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`); if(!res.ok) throw new Error('not found');
    return res.json();
  },
  async createTask(t){
    const res = await fetch('/api/tasks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(t)});
    if(!res.ok) throw new Error('create failed');
    return res.json();
  },
  async updateTask(id,t){
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(t)});
    if(!res.ok) throw new Error('update failed');
    return res.json();
  },
  async deleteTask(id){
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`,{method:'DELETE'});
    if(!res.ok && res.status!==204) throw new Error('delete failed');
  }
}

/* Router */
async function route(){
  // normalize hash: remove leading # and optional leading slash
  const raw = location.hash.replace(/^#\/?/, '') || 'list';
  const [path, id] = raw.split('/').filter(Boolean);
  if(path === 'view') return renderView(decodeURIComponent(id || ''));
  if(path === 'edit') return renderEdit(decodeURIComponent(id || ''));
  if(path === 'new') return renderNew();
  return renderList();
}

/* Views */
const viewEl = qs('#view')

async function renderList(){
  let tasks = []
  try{ tasks = await API.getTasks(); }catch(e){toast('Unable to load tasks',true)}
  tasks = tasks.sort((a,b)=>b.updatedAt - a.updatedAt)
  viewEl.innerHTML = `
  <section class="container" aria-label="Task list">
    <div class="header-row">
      <div class="h1">Your Tasks <span class="tag">${tasks.length}</span></div>
      <div class="search">
        <input id="filter" class="input" placeholder="Search tasks or press /" />
      </div>
    </div>
    <div class="grid">
      ${tasks.map(t=>`<article class="card" data-id="${t.id}">
        <strong>${escapeHtml(t.title)}</strong>
        <div class="meta">${escapeHtml(t.description || '')}</div>
        <div class="actions">
          <button class="small secondary" data-action="view">View</button>
          <button class="small secondary" data-action="edit">Edit</button>
          <button class="small" data-action="delete" style="background:rgba(255,80,80,0.12);">Delete</button>
        </div>
      </article>`).join('')}
    </div>
    ${tasks.length===0?'<div class="empty">No tasks yet — create one to get started.</div>':''}
  </section>`

  // delegated events on the grid (more reliable)
  const grid = qs('.grid')
  if(grid){
    grid.addEventListener('click', e=>{
      const btn = e.target.closest('[data-action]');
      if(!btn) return;
      const card = btn.closest('.card');
      if(!card) return;
      const id = card.dataset.id;
      const action = btn.dataset.action;
      console.log('task action', action, id);
      if(action==='view') location.hash = `#/view/${id}`;
      else if(action==='edit') location.hash = `#/edit/${id}`;
      else if(action==='delete') handleDelete(id);
    })
  }

  const filter = qs('#filter'); filter.focus()
  filter.oninput = ()=>applyFilter(filter.value)
}

function renderNew(){viewEl.innerHTML = `
  <section class="container" aria-label="New task">
    <div class="header-row"><div class="h1">Create Task</div></div>
    <form id="task-form" class="form">
      <input id="title" class="input" placeholder="Title" required />
      <textarea id="description" class="input" placeholder="Description (optional)"></textarea>
      <div class="row">
        <input id="due" type="date" class="input" />
        <select id="priority" class="input">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div class="row">
        <button class="btn primary" type="submit">Create</button>
        <button class="btn ghost" type="button" id="cancel">Cancel</button>
      </div>
    </form>
  </section>`
  const form = qs('#task-form')
  form.onsubmit = async e=>{e.preventDefault();const t = {id:uid(),title:qs('#title').value.trim(),description:qs('#description').value.trim(),due:qs('#due').value || null,priority:qs('#priority').value,createdAt:Date.now(),updatedAt:Date.now()};try{await API.createTask(t);toast('Task created');location.hash = '#/list'}catch(err){toast('Create failed',true)}}
  qs('#cancel').onclick = ()=>location.hash = '#/list'
}

function renderView(id){
  // fetch specific task from API
  API.getTask(id).then(t=>{
    viewEl.innerHTML = `
  <section class="container">
    <div class="header-row"><div class="h1">${escapeHtml(t.title)}</div>
      <div class="actions">
        <button class="small secondary" id="edit">Edit</button>
        <button class="small" id="delete" style="background:rgba(255,80,80,0.12)">Delete</button>
      </div>
    </div>
    <div class="meta">Priority: <strong>${t.priority}</strong> • Due: ${t.due||'—'}</div>
    <div style="margin-top:12px">${escapeHtml(t.description)||'<span class="muted">No description</span>'}</div>
  </section>`
    qs('#edit').onclick = ()=>location.hash = `#/edit/${id}`
    qs('#delete').onclick = ()=>handleDelete(id)
  }).catch(()=>{toast('Task not found', true);location.hash='#/list'})
}

function renderEdit(id){
  API.getTask(id).then(t=>{
    viewEl.innerHTML = `
  <section class="container" aria-label="Edit task">
    <div class="header-row"><div class="h1">Edit Task</div></div>
    <form id="task-form" class="form">
      <input id="title" class="input" value="${escapeHtml(t.title)}" required />
      <textarea id="description" class="input">${escapeHtml(t.description)}</textarea>
      <div class="row">
        <input id="due" type="date" class="input" value="${t.due||''}" />
        <select id="priority" class="input">
          <option value="low" ${t.priority==='low'?'selected':''}>Low</option>
          <option value="medium" ${t.priority==='medium'?'selected':''}>Medium</option>
          <option value="high" ${t.priority==='high'?'selected':''}>High</option>
        </select>
      </div>
      <div class="row">
        <button class="btn primary" type="submit">Save</button>
        <button class="btn ghost" type="button" id="cancel">Cancel</button>
      </div>
    </form>
  </section>`
    const form = qs('#task-form')
    form.onsubmit = async e=>{e.preventDefault();const payload={title:qs('#title').value.trim(),description:qs('#description').value.trim(),due:qs('#due').value||null,priority:qs('#priority').value};try{await API.updateTask(id,payload);toast('Saved');location.hash = `#/view/${id}`}catch(err){toast('Save failed',true)}}
    qs('#cancel').onclick = ()=>location.hash = `#/view/${id}`
  }).catch(()=>{toast('Not found', true);location.hash='#/list'})
}

/* Actions */
async function handleDelete(id){
  if(!confirm('Delete this task?')) return;
  try{
    await API.deleteTask(id);
    toast('Deleted');
    // refresh list view
    if(location.hash.includes('/view/') || location.hash.includes('/edit/')) location.hash = '#/list'
    else await renderList();
  }catch(err){
    toast('Delete failed', true);
  }
}

/* Helpers */
function applyFilter(q){q = q.trim().toLowerCase(); qsa('.card').forEach(c=>{const text = (c.querySelector('strong').textContent + ' ' + c.querySelector('.meta').textContent).toLowerCase();c.style.display = text.includes(q)?'block':'none'})}

function escapeHtml(s){if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\'":"&#39;","\"":"&quot;"})[c])}

/* Toast */
let toastTimer
function toast(msg, err=false){clearTimeout(toastTimer);let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';document.body.appendChild(el)}el.textContent=msg;el.style.background=err?'rgba(255,80,80,0.12)':'rgba(6,10,16,0.85)';el.classList.add('show');toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}

/* Navigation bindings */
qs('#nav-list').onclick = ()=>location.hash = '#/list'
qs('#nav-new').onclick = ()=>location.hash = '#/new'
window.addEventListener('hashchange', route)
window.addEventListener('load', ()=>{route();document.addEventListener('keydown', e=>{if(e.key==='/' && document.activeElement.tagName!=='INPUT' && document.activeElement.tagName!=='TEXTAREA'){e.preventDefault();const f = qs('#filter'); if(f){f.focus()}}})})

/* Expose for console */
window._tf = {api: API}
