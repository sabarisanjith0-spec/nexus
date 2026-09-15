import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.NEXUS_SUPABASE || {};
if (!cfg.url || !cfg.publishableKey) throw new Error('NEXUS Supabase config missing');
const sb = createClient(cfg.url, cfg.publishableKey);
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let me = null;
let profiles = [];
let activeDm = null;
let presenceRoom = null;
let typingRoom = null;
let dmRoom = null;

const safe = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avatar = (name, cls='') => `<div class="avatar ${cls}">${safe((name || 'U').slice(0,1).toUpperCase())}<span></span></div>`;
const toast = (t) => { const e=$('#toast'); if(!e) return; e.textContent=t; e.classList.add('show'); clearTimeout(window.__proToast); window.__proToast=setTimeout(()=>e.classList.remove('show'),2200); };

async function bootstrap(){
  const {data:{session}} = await sb.auth.getSession();
  if(!session) return;
  me=session.user;
  const [{data:ps},{data:channels}] = await Promise.all([
    sb.from('profiles').select('id,username').order('username').limit(100),
    sb.from('channels').select('id,name').order('created_at')
  ]);
  profiles=ps||[];
  wireDmList();
  wireFeatureButtons();
  setupPresence();
  setupNotifications();
  setupDirectRealtime();
  setupTyping();
  if(channels?.length) wireChannels(channels);
}

function wireChannels(channels){
  const map=new Map(channels.map(c=>[c.name,c.id]));
  $$('.channel').forEach(btn=>btn.onclick=()=>{ $$('channel').forEach(()=>{}); activeDm=null; $('#contextIcon').textContent='#'; const name=btn.dataset.channel; if(name) toast(`#${name}`); });
}

function wireDmList(){
  const box=$('#dmList'); if(!box) return;
  box.innerHTML='';
  profiles.filter(p=>p.id!==me.id).slice(0,20).forEach(p=>{
    const b=document.createElement('button'); b.className='dm-item'; b.innerHTML=`${avatar(p.username,'mini')}<span>${safe(p.username)}</span><i></i>`; b.onclick=()=>openDm(p); box.appendChild(b);
  });
}

async function openDm(person){
  activeDm=person;
  $('#homeHero').style.display='none';
  $('#contextIcon').textContent='↗';
  $('#channelTitle').textContent=person.username;
  $('#channelSubtitle').textContent='Private conversation';
  $('#viewModeLabel').textContent='Direct message';
  $('#messageInput').placeholder=`Message ${person.username}`;
  const {data,error}=await sb.from('direct_messages').select('id,body,created_at,sender_id,recipient_id').or(`and(sender_id.eq.${me.id},recipient_id.eq.${person.id}),and(sender_id.eq.${person.id},recipient_id.eq.${me.id})`).order('created_at').limit(200);
  if(error){toast(error.message);return;}
  renderDmMessages(data||[],person);
  subscribeDm(person);
  $('#messageForm').onsubmit=async(e)=>{e.preventDefault(); const input=$('#messageInput'); const text=input.value.trim(); if(!text)return; const {error:sendError}=await sb.from('direct_messages').insert({sender_id:me.id,recipient_id:person.id,body:text}); if(sendError)toast(sendError.message); else {input.value='';saveDmDraft(person.id,'');}};
  restoreDmDraft(person.id);
}

function renderDmMessages(rows,person){
  const feed=$('#feed'); feed.innerHTML='';
  if(!rows.length){feed.innerHTML=`<div class="empty-state"><div class="hero-tag">PRIVATE CHAT</div><h3>Say hello to ${safe(person.username)}.</h3><p>This conversation is private to both participants.</p></div>`;return;}
  rows.forEach(m=>{const mine=m.sender_id===me.id; const a=document.createElement('article'); a.className=`message ${mine?'mine':''}`; a.innerHTML=`<div class="message-row">${avatar(mine?'You':person.username,mine?'av-cyan':'av-purple')}<div class="message-body"><div class="meta"><strong>${safe(mine?'You':person.username)}</strong><span>${new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div><p>${safe(m.body).replace(/\n/g,'<br>')}</p><div class="reaction-row"><button data-r="👍">👍</button><button data-r="❤️">❤️</button><button data-r="🔥">🔥</button></div></div></div>`; a.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>dmReaction(m.id,b.dataset.r)); feed.appendChild(a);}); feed.scrollTop=feed.scrollHeight;
}

async function dmReaction(messageId,emoji){ await sb.from('message_reactions').upsert({message_id:messageId,user_id:me.id,emoji}); toast(`${emoji} reaction added`); }
function subscribeDm(person){ if(dmRoom)sb.removeChannel(dmRoom); dmRoom=sb.channel(`nexus:dm:${[me.id,person.id].sort().join(':')}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages'},p=>{if((p.new.sender_id===me.id&&p.new.recipient_id===person.id)||(p.new.sender_id===person.id&&p.new.recipient_id===me.id))openDm(person);}).subscribe(); }

function saveDmDraft(id,text){const key=`nexus:dm-draft:${id}`; text?localStorage.setItem(key,text):localStorage.removeItem(key);}
function restoreDmDraft(id){const key=`nexus:dm-draft:${id}`; const v=localStorage.getItem(key)||''; const input=$('#messageInput'); if(input)input.value=v; input?.addEventListener('input',()=>saveDmDraft(id,input.value),{once:false});}

function setupPresence(){
  presenceRoom=sb.channel('nexus:presence',{config:{presence:{key:me.id}}});
  presenceRoom.on('presence',{event:'sync'},()=>{const state=presenceRoom.presenceState();const users=Object.values(state).flat();$('#onlineStat').textContent=String(users.length);$('#presenceTitle').textContent=`${users.length} online now`;$('#presenceSubtitle').textContent='Live workspace presence';}).subscribe(async status=>{if(status==='SUBSCRIBED'){const p=profiles.find(x=>x.id===me.id);await presenceRoom.track({user_id:me.id,username:p?.username||'User',online_at:new Date().toISOString()});}});
}

function setupNotifications(){
  sb.channel(`nexus:notifications:${me.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${me.id}`},payload=>{const b=$('#inboxBadge');if(b)b.textContent=String((Number(b.textContent)||0)+1);if(document.hidden){document.title='NEXUS · New notification';}}).subscribe();
  $('#inboxBtn')?.addEventListener('click',async()=>{const {data}=await sb.from('notifications').select('*').eq('user_id',me.id).order('created_at',{ascending:false}).limit(50);openDrawer('Inbox',(data||[]).map(n=>`<button class="notification-card"><span class="notif-icon">✉</span><div><strong>${safe(n.title)}</strong><p>${safe(n.body)}</p><small>${new Date(n.created_at).toLocaleString()}</small></div></button>`).join('')||'<div class="empty-command">All caught up.</div>');await sb.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',me.id).is('read_at',null);const b=$('#inboxBadge');if(b)b.textContent='0';});
}

function setupDirectRealtime(){
  sb.channel(`nexus:direct:${me.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages'},payload=>{if(payload.new.recipient_id===me.id && document.hidden)document.title='NEXUS · New message';}).subscribe();
}

function setupTyping(){
  const input=$('#messageInput'); if(!input)return;
  let timer;
  input.addEventListener('input',()=>{if(!activeDm)return;if(typingRoom)sb.removeChannel(typingRoom);typingRoom=sb.channel(`nexus:typing:${[me.id,activeDm.id].sort().join(':')}`,{config:{broadcast:{self:false}}}).subscribe(status=>{if(status==='SUBSCRIBED')typingRoom.send({type:'broadcast',event:'typing',payload:{user_id:me.id,username:'You',typing:true}});});clearTimeout(timer);timer=setTimeout(()=>typingRoom?.send({type:'broadcast',event:'typing',payload:{user_id:me.id,username:'You',typing:false}}),900);});
}

function wireFeatureButtons(){
  $('#newDmBtn')?.addEventListener('click',()=>{openDrawer('New direct message',`<div class="dm-picker">${profiles.filter(p=>p.id!==me.id).map(p=>`<button data-person="${p.id}">${avatar(p.username,'mini')}<span>${safe(p.username)}</span></button>`).join('')}</div>`);$$('#drawer [data-person]').forEach(b=>b.onclick=()=>{const p=profiles.find(x=>x.id===b.dataset.person);closeDrawer();openDm(p);});});
  $('#membersBtn')?.addEventListener('click',()=>openDrawer('People',`<div class="drawer-people">${profiles.filter(p=>p.id!==me.id).map(p=>`<button class="person-card" data-person="${p.id}">${avatar(p.username,'mini')}<span>${safe(p.username)}</span></button>`).join('')}</div>`));
  $('#accountBtn')?.addEventListener('click',()=>openDrawer('Account',`<div class="profile-hero">${avatar(profiles.find(p=>p.id===me.id)?.username||'You','xl')}<h3>${safe(profiles.find(p=>p.id===me.id)?.username||'You')}</h3><small>${safe(me.email||'')}</small></div><div class="settings-block"><label>Session</label><button id="pfSignOut">Sign out</button></div>`));
}
function openDrawer(title,body){$('#drawer').innerHTML=`<div class="drawer-head"><div><span class="eyebrow">NEXUS</span><h3>${safe(title)}</h3></div><button class="icon-btn" id="closeDrawer">×</button></div><div class="drawer-body">${body}</div>`;$('#drawerOverlay').hidden=false;$('#closeDrawer').onclick=closeDrawer;$('#pfSignOut')?.addEventListener('click',()=>sb.auth.signOut());$$('#drawer [data-person]').forEach(b=>b.onclick=()=>{const p=profiles.find(x=>x.id===b.dataset.person);closeDrawer();openDm(p);});}
function closeDrawer(){$('#drawerOverlay').hidden=true;}

sb.auth.onAuthStateChange((_event,s)=>{if(s){me=s.user;bootstrap();} });
bootstrap();
