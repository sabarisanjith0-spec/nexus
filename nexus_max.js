// NEXUS MAX runtime layer — session bridge, reliability, power tools and UX upgrades.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.NEXUS_SUPABASE || {};
const sb = cfg.url && cfg.publishableKey ? createClient(cfg.url, cfg.publishableKey) : null;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast = (t) => { const e=$('#toast'); if(!e)return; e.textContent=t; e.classList.add('show'); clearTimeout(window.__nxMaxToast); window.__nxMaxToast=setTimeout(()=>e.classList.remove('show'),2400); };

const MAX = { session:null, online:navigator.onLine, unread:new Map() };

function authOverlay(session){
  const overlay=$('#authOverlay');
  if(!overlay)return;
  if(session){ overlay.hidden=true; document.documentElement.dataset.nexusAuthenticated='true'; }
  else { overlay.hidden=false; document.documentElement.dataset.nexusAuthenticated='false'; }
}

async function syncSession(reason='startup'){
  if(!sb)return null;
  try {
    const {data,error}=await sb.auth.getSession();
    if(error) throw error;
    MAX.session=data.session;
    window.NEXUS_SESSION=data.session || null;
    authOverlay(data.session);
    if(data.session){
      const user=data.session.user;
      const name=user.user_metadata?.username || user.email?.split('@')[0] || 'Operator';
      const u=$('#currentUsername'), em=$('#currentEmail');
      if(u && u.textContent==='Operator') u.textContent=name;
      if(em) em.textContent=user.email||'';
      const status=$('#connectionStatus');
      if(status && (status.textContent==='Sign in required'||status.textContent==='Signed out')){
        status.textContent='Live sync'; status.parentElement?.classList.add('is-live');
      }
    }
    return data.session || null;
  } catch(e){
    console.warn('[NEXUS MAX] session sync', reason, e);
    return null;
  }
}

function patchChannelAuth(){
  document.addEventListener('click', async (e)=>{
    const channel=e.target.closest?.('.channel');
    if(!channel)return;
    const s=await syncSession('channel-click');
    if(s) authOverlay(s);
  }, true);
}

function draftKey(channel){ return `nexus:max-draft:${channel}`; }
function currentChannel(){ return document.querySelector('.channel.active')?.dataset.channel || 'general'; }
function wireDrafts(){
  const input=$('#messageInput'); if(!input)return;
  const restore=()=>{ const key=draftKey(currentChannel()); input.value=localStorage.getItem(key)||''; const hint=$('#draftHint'); if(hint)hint.textContent=input.value?'Draft restored':''; };
  input.addEventListener('input',()=>{ const key=draftKey(currentChannel()); const text=input.value; if(text) localStorage.setItem(key,text); else localStorage.removeItem(key); });
  document.addEventListener('click',(e)=>{ if(e.target.closest?.('.channel')) setTimeout(restore,0); });
  restore();
  const form=$('#messageForm'); form?.addEventListener('submit',()=>setTimeout(()=>{localStorage.removeItem(draftKey(currentChannel())); const hint=$('#draftHint'); if(hint)hint.textContent='';},50),true);
}

function addMaxStyles(){
  if($('#nexusMaxStyle'))return;
  const s=document.createElement('style'); s.id='nexusMaxStyle'; s.textContent=`
    .nxm-bar{position:fixed;right:14px;bottom:14px;z-index:85;display:flex;gap:6px;align-items:center;padding:6px;background:#090d15dd;border:1px solid var(--line);border-radius:999px;backdrop-filter:blur(12px);box-shadow:0 12px 45px #0008}.nxm-bar button{border:0;background:#141b28;color:#cbd3e2;border-radius:999px;padding:7px 10px;font:700 10px 'Space Grotesk',sans-serif;cursor:pointer}.nxm-bar button:hover{background:#202a3d}.nxm-dot{width:7px;height:7px;border-radius:50%;background:#5de6a2;box-shadow:0 0 12px #5de6a2}.nxm-dot.off{background:#ff7188;box-shadow:0 0 12px #ff7188}
    .nxm-overlay{position:fixed;inset:0;z-index:150;background:rgba(2,4,10,.72);backdrop-filter:blur(16px);display:none;align-items:flex-start;justify-content:center;padding:8vh 18px}.nxm-overlay.show{display:flex}.nxm-card{width:min(880px,96vw);max-height:84vh;overflow:auto;background:#0b1019;border:1px solid var(--line);border-radius:20px;box-shadow:0 40px 140px #000c}.nxm-head{display:flex;gap:10px;padding:14px;border-bottom:1px solid var(--line);align-items:center}.nxm-head input{flex:1;background:#080c13;border:1px solid var(--line);color:#eef3ff;border-radius:10px;padding:11px 12px;outline:none}.nxm-body{padding:14px}.nxm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.nxm-tile{border:1px solid var(--line);background:#0e141e;border-radius:13px;padding:13px;text-align:left;color:var(--text);cursor:pointer}.nxm-tile:hover{background:#151d2a;border-color:rgba(124,108,255,.5);transform:translateY(-1px)}.nxm-tile b{display:block;font-size:12px}.nxm-tile span{display:block;margin-top:5px;font-size:10px;color:#7c879a;line-height:1.45}.nxm-stat{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.nxm-pill{font-size:9px;color:#9eabc0;border:1px solid var(--line);padding:5px 8px;border-radius:999px;background:#0e141e}.nxm-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px;border:1px solid var(--line);border-radius:10px;background:#0e141e;margin-top:7px}.nxm-row small{color:#778298}.nxm-row button{border:0;background:#1a2332;color:#d8e0ef;border-radius:8px;padding:7px 9px;cursor:pointer}.nxm-auth-ok{outline:1px solid rgba(96,233,169,.18)}
    @media(max-width:760px){.nxm-grid{grid-template-columns:1fr 1fr}.nxm-bar{left:10px;right:10px;justify-content:center}}
  `; document.head.appendChild(s);
}

function openMax(){
  let ov=$('#nxMaxOverlay');
  if(!ov){
    ov=document.createElement('div'); ov.id='nxMaxOverlay'; ov.className='nxm-overlay'; ov.innerHTML=`<div class="nxm-card"><div class="nxm-head"><strong>NEXUS MAX</strong><input id="nxmQuery" placeholder="Search tools, people, messages…" autocomplete="off"><button class="icon-btn" id="nxmClose">×</button></div><div class="nxm-body" id="nxmBody"></div></div>`; document.body.appendChild(ov);
    $('#nxmClose').onclick=()=>ov.classList.remove('show'); ov.onclick=e=>{if(e.target===ov)ov.classList.remove('show');};
    $('#nxmQuery').oninput=()=>renderMax($('#nxmQuery').value.trim().toLowerCase());
  }
  ov.classList.add('show'); $('#nxmQuery').value=''; renderMax(''); setTimeout(()=>$('#nxmQuery').focus(),0);
}

function renderMax(q){
  const b=$('#nxmBody'); if(!b)return;
  const tools=[
    ['Global search','Search stored messages and profiles',globalSearch],
    ['Saved vault','Open your saved messages',savedVault],
    ['Pinned','Show pinned conversation anchors',pinnedView],
    ['Unread','See channel activity tracked on this device',unreadView],
    ['Drafts','Review channel drafts saved locally',draftView],
    ['Workspace health','Connection and runtime diagnostics',healthView],
    ['Shortcuts','Keyboard command map',shortcutView],
    ['Appearance','Cycle NEXUS signal theme',cycleTheme],
    ['Focus mode','Distraction-free workspace',focusMode],
    ['Density','Cycle compactness',cycleDensity],
    ['Reset local UI','Clear drafts/unread/theme preferences',resetLocal]
  ].filter(x=>!q||`${x[0]} ${x[1]}`.toLowerCase().includes(q));
  b.innerHTML=`<div class="nxm-stat"><span class="nxm-pill">${MAX.session?'AUTHENTICATED':'SIGNED OUT'}</span><span class="nxm-pill">${MAX.online?'ONLINE':'OFFLINE'}</span><span class="nxm-pill">${navigator.language}</span></div><div class="nxm-grid">${tools.map((t,i)=>`<button class="nxm-tile" data-max-tool="${i}"><b>${esc(t[0])}</b><span>${esc(t[1])}</span></button>`).join('')}</div>${tools.length?'':'<div class="empty-command">No MAX tools match that search.</div>'}`;
  b.querySelectorAll('[data-max-tool]').forEach(el=>el.onclick=()=>{const tool=tools[Number(el.dataset.maxTool)]; if(tool){$('#nxMaxOverlay')?.classList.remove('show');tool[2]();}});
}

async function globalSearch(){
  if(!sb||!MAX.session){toast('Sign in to search the network');return;}
  let ov=$('#nxSearchOverlay');
  if(!ov){ov=document.createElement('div');ov.id='nxSearchOverlay';ov.className='nxm-overlay';ov.innerHTML=`<div class="nxm-card"><div class="nxm-head"><strong>GLOBAL SEARCH</strong><input id="nxSearchBox" placeholder="Search messages or people…"><button class="icon-btn" id="nxSearchClose">×</button></div><div class="nxm-body" id="nxSearchResults"></div></div>`;document.body.appendChild(ov);$('#nxSearchClose').onclick=()=>ov.classList.remove('show');ov.onclick=e=>{if(e.target===ov)ov.classList.remove('show');};$('#nxSearchBox').onkeydown=e=>{if(e.key==='Enter')run();};}
  ov.classList.add('show'); $('#nxSearchBox').value=''; $('#nxSearchResults').innerHTML='<div class="empty-command">Type a query and press Enter.</div>'; $('#nxSearchBox').focus();
  async function run(){const q=$('#nxSearchBox').value.trim();if(!q)return;const root=$('#nxSearchResults');root.innerHTML='<div class="empty-command">Searching…</div>';const [{data:msgs,error:me},{data:people}]=await Promise.all([sb.from('messages').select('id,body,created_at').ilike('body',`%${q}%`).order('created_at',{ascending:false}).limit(40),sb.from('profiles').select('id,username').ilike('username',`%${q}%`).limit(20)]);if(me){root.innerHTML=`<div class="empty-command">${esc(me.message)}</div>`;return;}root.innerHTML='';(people||[]).forEach(p=>{const r=document.createElement('div');r.className='nxm-row';r.innerHTML=`<div><b>@${esc(p.username)}</b><small>person</small></div><button>Open</button>`;r.querySelector('button').onclick=()=>{ov.classList.remove('show');toast(`Profile: ${p.username}`)};root.appendChild(r)});(msgs||[]).forEach(m=>{const r=document.createElement('div');r.className='nxm-row';r.innerHTML=`<div><b>${esc(m.body.slice(0,110))}</b><small>${new Date(m.created_at).toLocaleString()}</small></div><button>Jump</button>`;r.querySelector('button').onclick=()=>{ov.classList.remove('show');const el=$(`[data-message-id="${m.id}"]`);el?.scrollIntoView({behavior:'smooth',block:'center'});el?.classList.add('nxm-auth-ok');setTimeout(()=>el?.classList.remove('nxm-auth-ok'),1600)};root.appendChild(r)});if(!root.children.length)root.innerHTML='<div class="empty-command">No matches.</div>';}
}

async function savedVault(){
  if(!sb||!MAX.session){toast('Sign in to use Saved');return;}
  const body=buildPanel('SAVED VAULT'); const {data,error}=await sb.from('saved_messages').select('created_at,message_id,messages(body,created_at)').eq('user_id',MAX.session.user.id).order('created_at',{ascending:false}).limit(100); if(error){body.innerHTML=`<div class="empty-command">${esc(error.message)}</div>`;return;}body.innerHTML=(data||[]).map(x=>`<div class="nxm-row"><div><b>◇ ${esc(x.messages?.body||'Message unavailable')}</b><small>${x.messages?.created_at?new Date(x.messages.created_at).toLocaleString():''}</small></div></div>`).join('')||'<div class="empty-command">Nothing saved yet.</div>';
}
async function pinnedView(){
  if(!sb||!MAX.session){toast('Sign in to use Pinned');return;} const body=buildPanel('PINNED'); const {data,error}=await sb.from('pinned_messages').select('created_at,message_id,messages(body,created_at)').order('created_at',{ascending:false}).limit(100);if(error){body.innerHTML=`<div class="empty-command">${esc(error.message)}</div>`;return;}body.innerHTML=(data||[]).map(x=>`<div class="nxm-row"><div><b>⌖ ${esc(x.messages?.body||'Message unavailable')}</b><small>${x.messages?.created_at?new Date(x.messages.created_at).toLocaleString():''}</small></div></div>`).join('')||'<div class="empty-command">No pinned messages yet.</div>';
}
function unreadView(){const body=buildPanel('UNREAD');const rows=[...MAX.unread.entries()].filter(([,n])=>n>0);body.innerHTML=rows.map(([ch,n])=>`<div class="nxm-row"><b>#${esc(ch)}</b><span>${n} new message${n===1?'':'s'}</span></div>`).join('')||'<div class="empty-command">No tracked unread activity.</div>';}
function draftView(){const body=buildPanel('DRAFTS');const rows=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('nexus:max-draft:'))rows.push([k.replace('nexus:max-draft:',''),localStorage.getItem(k)||'']);}body.innerHTML=rows.map(([ch,text])=>`<div class="nxm-row"><div><b>#${esc(ch)}</b><small>${esc(text.slice(0,120))}</small></div><button>Use</button></div>`).join('')||'<div class="empty-command">No drafts stored.</div>';body.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{const ch=btn.closest('.nxm-row')?.querySelector('b')?.textContent?.replace('#','');if(ch)toast(`Draft ready for #${ch}`);});}
function healthView(){const body=buildPanel('WORKSPACE HEALTH');const s=MAX.session;body.innerHTML=`<div class="nxm-stat"><span class="nxm-pill">AUTH ${s?'OK':'NONE'}</span><span class="nxm-pill">NETWORK ${MAX.online?'ONLINE':'OFFLINE'}</span><span class="nxm-pill">VISIBILITY ${document.hidden?'BACKGROUND':'FOREGROUND'}</span><span class="nxm-pill">PLATFORM ${esc(navigator.platform||'browser')}</span></div><div class="nxm-row"><span>Current channel</span><small>#${esc(currentChannel())}</small></div><div class="nxm-row"><span>Saved drafts</span><small>${countDrafts()}</small></div>`;}
function shortcutView(){const body=buildPanel('SHORTCUTS');body.innerHTML=`<div class="nxm-row"><b>Ctrl/⌘ + Shift + X</b><small>NEXUS MAX</small></div><div class="nxm-row"><b>Ctrl/⌘ + Shift + F</b><small>Infinity shell</small></div><div class="nxm-row"><b>Ctrl/⌘ + /</b><small>Focus search</small></div><div class="nxm-row"><b>Esc</b><small>Close overlays</small></div><div class="nxm-row"><b>Enter</b><small>Send message</small></div><div class="nxm-row"><b>Shift + Enter</b><small>New line</small></div>`;}
function buildPanel(title){let ov=$('#nxInfoOverlay');if(!ov){ov=document.createElement('div');ov.id='nxInfoOverlay';ov.className='nxm-overlay';ov.innerHTML=`<div class="nxm-card"><div class="nxm-head"><strong id="nxInfoTitle"></strong><span style="flex:1"></span><button class="icon-btn" id="nxInfoClose">×</button></div><div class="nxm-body" id="nxInfoBody"></div></div>`;document.body.appendChild(ov);$('#nxInfoClose').onclick=()=>ov.classList.remove('show');ov.onclick=e=>{if(e.target===ov)ov.classList.remove('show');};}$('#nxInfoTitle').textContent=title;ov.classList.add('show');return $('#nxInfoBody');}
function cycleTheme(){const themes=['violet','cyan','mono'];const now=localStorage.getItem('nexus:max-theme')||'violet';const next=themes[(themes.indexOf(now)+1)%themes.length];localStorage.setItem('nexus:max-theme',next);document.body.dataset.nexusTheme=next;toast(`Theme: ${next}`);}
function focusMode(){document.body.classList.toggle('nxm-focus');if(!$('#nxMaxStyleFocus')){const s=document.createElement('style');s.id='nxMaxStyleFocus';s.textContent='.nxm-focus .sidebar,.nxm-focus .members-panel{opacity:.22;filter:blur(.2px)}.nxm-focus .main-panel{box-shadow:0 0 0 1px rgba(124,108,255,.15),0 0 100px rgba(124,108,255,.05)}';document.head.appendChild(s)}toast(document.body.classList.contains('nxm-focus')?'Focus mode ON':'Focus mode OFF');}
function cycleDensity(){const arr=['comfortable','compact','ultra'];const next=arr[(arr.indexOf(localStorage.getItem('nexus:max-density')||'comfortable')+1)%arr.length];localStorage.setItem('nexus:max-density',next);document.body.classList.remove('compact','nxm-ultra');if(next==='compact')document.body.classList.add('compact');if(next==='ultra')document.body.classList.add('nxm-ultra');toast(`Density: ${next}`);}
function resetLocal(){for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith('nexus:max-')||k?.startsWith('nexus:max-draft:'))localStorage.removeItem(k);}MAX.unread.clear();document.body.classList.remove('compact','nxm-focus','nxm-ultra');toast('Local NEXUS MAX preferences reset');}
function countDrafts(){let n=0;for(let i=0;i<localStorage.length;i++)if(localStorage.key(i)?.startsWith('nexus:max-draft:'))n++;return n;}

function addMaxBar(){if($('#nxmBar'))return;const bar=document.createElement('div');bar.id='nxmBar';bar.className='nxm-bar';bar.innerHTML=`<span id="nxmNet" class="nxm-dot"></span><button id="nxmMaxBtn">MAX</button><button id="nxmSearchBtn">⌕</button>`;document.body.appendChild(bar);$('#nxmMaxBtn').onclick=openMax;$('#nxmSearchBtn').onclick=globalSearch;}
function networkState(){const dot=$('#nxmNet');if(dot)dot.classList.toggle('off',!MAX.online);}
function trackUnread(){ if(!sb||!MAX.session)return; sb.channel('nexus-max-unread').on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},payload=>{if(document.hidden){const ch=currentChannel();MAX.unread.set(ch,(MAX.unread.get(ch)||0)+1);}}).subscribe(); }

window.addEventListener('online',()=>{MAX.online=true;networkState();toast('Connection restored');syncSession('online');});
window.addEventListener('offline',()=>{MAX.online=false;networkState();toast('Offline mode — local drafts remain available');});
window.addEventListener('focus',()=>syncSession('focus'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncSession('visible');});
document.addEventListener('keydown',e=>{const mod=e.ctrlKey||e.metaKey;if(mod&&e.shiftKey&&e.key.toLowerCase()==='x'){e.preventDefault();openMax();}if(mod&&e.key==='/'){e.preventDefault();$('#searchInput')?.focus();}});

if(sb) sb.auth.onAuthStateChange((_event,session)=>{MAX.session=session;window.NEXUS_SESSION=session||null;authOverlay(session);networkState();if(session)trackUnread();});

addMaxStyles();
addMaxBar();
patchChannelAuth();
wireDrafts();
syncSession('startup').then(s=>{MAX.session=s;networkState();trackUnread();});
