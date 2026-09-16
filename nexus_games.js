// NEXUS GAME HUB — realtime mini-games for 2–7 players.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.NEXUS_SUPABASE || {};
const sb = cfg.url && cfg.publishableKey ? createClient(cfg.url, cfg.publishableKey) : null;
const $ = (s) => document.querySelector(s);
const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const GAMES = [
  {id:'ttt',name:'Tic Tac Toe',emoji:'❌',min:2,max:2,desc:'Classic 3×3 duel.'},
  {id:'c4',name:'Connect Four',emoji:'🟡',min:2,max:2,desc:'Drop four in a row.'},
  {id:'rps',name:'Rock Paper Scissors',emoji:'✊',min:2,max:2,desc:'Fast simultaneous rounds.'},
  {id:'reaction',name:'Reaction Rush',emoji:'⚡',min:2,max:7,desc:'React first. Score fastest.'},
  {id:'quiz',name:'Quiz Blitz',emoji:'🧠',min:2,max:7,desc:'Race through quick questions.'},
  {id:'number',name:'Number Clash',emoji:'🔢',min:2,max:7,desc:'Closest number wins each round.'},
  {id:'word',name:'Word Chain',emoji:'🔤',min:2,max:7,desc:'Keep the chain alive.'},
  {id:'memory',name:'Memory Match',emoji:'🧩',min:2,max:7,desc:'Find matching pairs together.'}
];

const MAX_ROOMS = 7;
let room = null, roomChannel = null, me = null, presenceKey = null;
const state = { game:null, hostId:null, phase:'lobby', players:[], board:null, turn:0, scores:{}, winner:null, round:0, target:null, submissions:{}, question:null, answer:null, startedAt:null, chain:[], memory:[], matched:[], flipped:[], ready:{} };

function styles(){
  if($('#nxGamesStyle')) return;
  const s=document.createElement('style'); s.id='nxGamesStyle'; s.textContent=`
  .nxg-overlay{position:fixed;inset:0;z-index:180;background:rgba(2,4,10,.78);backdrop-filter:blur(18px);display:none;align-items:center;justify-content:center;padding:18px}.nxg-overlay.show{display:flex}.nxg-card{width:min(1120px,97vw);max-height:94vh;overflow:auto;background:linear-gradient(145deg,#0b1019,#111827);border:1px solid rgba(255,255,255,.1);border-radius:24px;box-shadow:0 40px 140px #000d;color:#eef3ff}.nxg-head{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:rgba(11,16,25,.94);backdrop-filter:blur(15px);z-index:2}.nxg-head strong{font:800 16px 'Space Grotesk',sans-serif}.nxg-head small{display:block;color:#77849c;font-size:9px;margin-top:2px}.nxg-head-spacer{flex:1}.nxg-body{padding:18px}.nxg-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.nxg-tile{border:1px solid rgba(255,255,255,.08);background:#0d1420;border-radius:16px;padding:14px;text-align:left;color:#dce5f4;cursor:pointer;min-height:138px;transition:.18s}.nxg-tile:hover{transform:translateY(-2px);border-color:rgba(124,108,255,.55);background:#141d2c}.nxg-tile b{font-size:13px}.nxg-tile .nxg-emoji{font-size:26px;display:block;margin-bottom:8px}.nxg-tile span{display:block;color:#7d8aa1;font-size:10px;line-height:1.45;margin-top:6px}.nxg-meta{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}.nxg-pill{padding:6px 9px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:#0d1420;color:#9eabc0;font-size:9px}.nxg-layout{display:grid;grid-template-columns:290px 1fr;gap:14px}.nxg-panel{border:1px solid rgba(255,255,255,.08);background:#0d1420;border-radius:16px;padding:14px}.nxg-panel h3{margin:0 0 10px;font-size:12px}.nxg-code{font:800 28px 'Space Grotesk',sans-serif;letter-spacing:7px;color:#fff;text-align:center;background:#080d14;padding:18px;border-radius:14px;border:1px solid rgba(255,255,255,.06)}.nxg-input{width:100%;box-sizing:border-box;background:#090e16;border:1px solid rgba(255,255,255,.08);color:#eef3ff;padding:10px 11px;border-radius:10px;outline:0}.nxg-row{display:flex;gap:8px;align-items:center}.nxg-btn{border:0;background:#5f51d9;color:#fff;padding:10px 12px;border-radius:10px;font-weight:800;cursor:pointer}.nxg-btn.ghost{background:#182131;color:#ccd6e7}.nxg-btn.warn{background:#8d394e}.nxg-players{display:grid;gap:7px}.nxg-player{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 9px;border:1px solid rgba(255,255,255,.06);border-radius:10px;background:#0a111b}.nxg-player small{color:#718097}.nxg-board{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:430px;background:radial-gradient(circle at 50% 20%,rgba(98,78,255,.08),transparent 40%),#0a0f18;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px}.nxg-status{font-size:11px;color:#9aa7bb;text-align:center;margin-bottom:12px}.nxg-ttt{display:grid;grid-template-columns:repeat(3,100px);gap:9px}.nxg-cell{width:100px;height:100px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:#111a27;color:#fff;font-size:36px;font-weight:900;cursor:pointer}.nxg-cell:hover{background:#182335}.nxg-c4{display:grid;grid-template-columns:repeat(7,58px);gap:6px;padding:10px}.nxg-c4 .slot{width:58px;height:58px;border-radius:50%;background:#0b121c;border:1px solid rgba(255,255,255,.08);cursor:pointer;display:flex;align-items:center;justify-content:center}.nxg-c4 .disc{width:42px;height:42px;border-radius:50%}.nxg-rps{display:grid;grid-template-columns:repeat(3,140px);gap:12px}.nxg-choice{padding:22px 12px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:#111a27;color:#fff;font-size:18px;cursor:pointer}.nxg-choice:hover{border-color:rgba(124,108,255,.55)}.nxg-big{font-size:54px;font-weight:900}.nxg-question{font-size:24px;font-weight:800;max-width:720px;text-align:center;margin-bottom:18px}.nxg-answers{display:grid;grid-template-columns:repeat(2,minmax(220px,1fr));gap:10px;width:min(760px,100%)}.nxg-answer{padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:#101826;color:#e8eef9;cursor:pointer;text-align:left}.nxg-answer:hover{background:#182335}.nxg-number{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}.nxg-num{width:92px}.nxg-chain{font-size:22px;font-weight:800;text-align:center;margin-bottom:14px}.nxg-word{display:flex;gap:8px;width:min(500px,100%)}.nxg-memory{display:grid;grid-template-columns:repeat(4,72px);gap:9px}.nxg-memory button{width:72px;height:72px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:#121b29;color:#fff;font-size:22px;cursor:pointer}.nxg-memory button.open{background:#1b2940}.nxg-room-note{color:#7d899e;font-size:9px;line-height:1.5;margin-top:10px}.nxg-toast{margin-top:10px;color:#9da9bd;font-size:10px;text-align:center}.nxg-hide{display:none!important}
  @media(max-width:900px){.nxg-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.nxg-layout{grid-template-columns:1fr}.nxg-ttt{grid-template-columns:repeat(3,76px)}.nxg-cell{width:76px;height:76px}.nxg-c4{grid-template-columns:repeat(7,42px)}.nxg-c4 .slot{width:42px;height:42px}.nxg-c4 .disc{width:30px;height:30px}}
  @media(max-width:600px){.nxg-grid{grid-template-columns:1fr}.nxg-head{padding:12px}.nxg-body{padding:12px}.nxg-rps{grid-template-columns:1fr}.nxg-answers{grid-template-columns:1fr}.nxg-memory{grid-template-columns:repeat(4,58px)}.nxg-memory button{width:58px;height:58px}}
  `; document.head.appendChild(s);
}

function openOverlay(){
  let ov=$('#nxGamesOverlay');
  if(!ov){
    ov=document.createElement('div'); ov.id='nxGamesOverlay'; ov.className='nxg-overlay'; ov.innerHTML=`<div class="nxg-card"><div class="nxg-head"><div><strong>NEXUS GAME HUB</strong><small>Play together • 2–7 players • realtime rooms</small></div><div class="nxg-head-spacer"></div><button class="icon-btn" id="nxgClose">×</button></div><div class="nxg-body" id="nxgBody"></div></div>`; document.body.appendChild(ov);
    $('#nxgClose').onclick=leaveRoom;
    ov.onclick=e=>{if(e.target===ov)leaveRoom();};
  }
  ov.classList.add('show');
}
function renderHub(){
  openOverlay(); const b=$('#nxgBody');
  b.innerHTML=`<div class="nxg-meta"><span class="nxg-pill">REALTIME MULTIPLAYER</span><span class="nxg-pill">2–7 PLAYERS</span><span class="nxg-pill">ROOM CODES</span><span class="nxg-pill">NO INSTALL</span></div><div class="nxg-grid">${GAMES.map(g=>`<button class="nxg-tile" data-game="${g.id}"><span class="nxg-emoji">${g.emoji}</span><b>${g.name}</b><span>${g.desc}</span><span>${g.min}–${g.max} players</span></button>`).join('')}</div><div class="nxg-panel" style="margin-top:14px"><h3>Join an existing room</h3><div class="nxg-row"><input class="nxg-input" id="nxgJoinCode" maxlength="6" placeholder="ROOM CODE"><button class="nxg-btn" id="nxgJoinBtn">Join</button></div><div class="nxg-room-note">Open a game, create a room, then share the six-character code with friends.</div></div>`;
  b.querySelectorAll('[data-game]').forEach(x=>x.onclick=()=>setupRoom(x.dataset.game));
  $('#nxgJoinBtn').onclick=()=>joinRoom($('#nxgJoinCode').value.trim().toUpperCase());
}

async function setupRoom(gameId){
  const g=GAMES.find(x=>x.id===gameId); if(!g)return;
  const session=(await sb?.auth.getSession())?.data?.session;
  if(!session){alert('Sign in to play multiplayer games.');return;}
  me=session.user;
  const code=Math.random().toString(36).slice(2,8).toUpperCase();
  room={code,gameId,hostId:me.id};
  await connectRoom();
  renderRoomLobby();
}
async function joinRoom(code){
  if(!/^[A-Z0-9]{6}$/.test(code)){alert('Enter a valid 6-character room code.');return;}
  const session=(await sb?.auth.getSession())?.data?.session;
  if(!session){alert('Sign in to play multiplayer games.');return;}
  me=session.user;
  room={code,gameId:null,hostId:null};
  await connectRoom();
  // Ask the current host to describe the room.
  send('hello',{});
}

async function connectRoom(){
  if(!sb||!room)return;
  if(roomChannel)await sb.removeChannel(roomChannel);
  presenceKey=me.id;
  roomChannel=sb.channel(`nexus:game:${room.code}`,{config:{presence:{key:presenceKey},broadcast:{ack:true}}});
  roomChannel.on('presence',{event:'sync'},syncPlayers);
  roomChannel.on('broadcast',{event:'hello'},payload=>{if(isHost())send('room_info',{gameId:room.gameId,hostId:room.hostId,state:safeSnapshot()});});
  roomChannel.on('broadcast',{event:'room_info'},payload=>{if(!room.gameId){room.gameId=payload.payload.gameId;room.hostId=payload.payload.hostId;applySnapshot(payload.payload.state);renderRoomLobby();}});
  roomChannel.on('broadcast',{event:'state'},payload=>{applySnapshot(payload.payload);renderGame();});
  roomChannel.on('broadcast',{event:'action'},payload=>{if(isHost())handleAction(payload.payload);});
  roomChannel.on('broadcast',{event:'kick'},payload=>{if(payload.payload?.userId===me.id)leaveRoom(true);});
  roomChannel.on('broadcast',{event:'chat'},payload=>showRoomChat(payload.payload));
  await new Promise((resolve,reject)=>roomChannel.subscribe(status=>{if(status==='SUBSCRIBED')resolve();if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')reject(new Error('Could not connect to game room'));}));
  await roomChannel.track({user_id:me.id,username:me.user_metadata?.username||me.email?.split('@')[0]||'Player'});
  setTimeout(syncPlayers,200);
}
function isHost(){return !!room&&room.hostId===me?.id;}
function playersFromPresence(){
  if(!roomChannel)return[]; const map=new Map(); const raw=roomChannel.presenceState(); Object.entries(raw).forEach(([key,arr])=>{const p=arr?.[0];if(p?.user_id)map.set(p.user_id,{id:p.user_id,name:p.username||'Player'});}); return [...map.values()].slice(0,MAX_ROOMS);
}
function syncPlayers(){
  state.players=playersFromPresence();
  state.players.forEach(p=>{if(state.scores[p.id]==null)state.scores[p.id]=0;});
  if(room && !room.gameId && state.players.length){return;}
  if(room?.gameId) renderRoomLobby();
  if(isHost() && state.phase==='lobby')maybeStartHost();
}
function maybeStartHost(){
  const g=GAMES.find(x=>x.id===room.gameId); if(!g)return;
  if(state.players.length===g.max && state.readyCount===g.max)startGame();
}
function renderRoomLobby(){
  openOverlay(); const b=$('#nxgBody'); const g=GAMES.find(x=>x.id===room.gameId);
  if(!g){ b.innerHTML='<div class="nxg-panel"><h3>Connecting to room…</h3><div class="nxg-toast">Waiting for the host.</div></div>'; return; }
  const full=state.players.length>=g.max;
  b.innerHTML=`<div class="nxg-layout"><div class="nxg-panel"><h3>${g.emoji} ${g.name}</h3><div class="nxg-code">${room.code}</div><div class="nxg-room-note">Share this code with friends. Host: ${isHost()?'you':esc(state.players.find(p=>p.id===room.hostId)?.name||'host')}</div><div style="margin-top:12px"><button class="nxg-btn ghost" id="nxgLeave">Leave room</button></div></div><div class="nxg-panel"><h3>Players ${state.players.length}/${g.max}</h3><div class="nxg-players">${state.players.map(p=>`<div class="nxg-player"><span>${p.id===room.hostId?'👑 ':''}${esc(p.name)}</span><small>${p.id===me.id?'YOU':''}</small></div>`).join('')}</div><div style="margin-top:12px"><button class="nxg-btn" id="nxgReady">${state.ready?.[me.id]?'READY ✓':'READY'}</button>${isHost()?`<button class="nxg-btn ghost" id="nxgStart" style="margin-left:8px">START</button>`:''}</div><div class="nxg-room-note">Minimum players: ${g.min}. Maximum: ${g.max}. Everyone can join until the room is full.</div></div></div>`;
  $('#nxgLeave').onclick=()=>leaveRoom(); $('#nxgReady').onclick=()=>{state.ready[me.id]=!state.ready[me.id];send('state',safeSnapshot());renderRoomLobby();};
  $('#nxgStart')?.addEventListener('click',()=>{if(state.players.length>=g.min)startGame();else alert(`Need at least ${g.min} players.`);});
}
function resetState(gameId){
  Object.assign(state,{game:gameId,phase:'playing',board:null,turn:0,winner:null,round:0,target:null,submissions:{},question:null,answer:null,startedAt:Date.now(),chain:[],memory:[],matched:[],flipped:[],ready:{}});
  state.scores={}; state.players.forEach(p=>state.scores[p.id]=0);
  if(gameId==='ttt')state.board=Array(9).fill(null);
  if(gameId==='c4')state.board=Array.from({length:6},()=>Array(7).fill(null));
  if(gameId==='rps')state.submissions={};
  if(gameId==='reaction')state.target=0;
  if(gameId==='quiz')nextQuizQuestion();
  if(gameId==='number')state.target=Math.floor(Math.random()*100)+1;
  if(gameId==='word')state.chain=[];
  if(gameId==='memory')initMemory();
}
function startGame(){if(!isHost())return;resetState(room.gameId);send('state',safeSnapshot());renderGame();}
function safeSnapshot(){return JSON.parse(JSON.stringify(state));}
function applySnapshot(s){if(!s)return;Object.assign(state,s);if(s.scores)state.scores=s.scores;renderGame();}
function send(event,payload){try{roomChannel?.send({type:'broadcast',event,payload});}catch(e){console.warn('game send',e)}}
function action(type,data={}){send('action',{type,playerId:me.id,...data});}

function renderGame(){
  openOverlay(); if(state.phase!=='playing'&&state.winner){renderResults();return;} const g=GAMES.find(x=>x.id===room?.gameId);if(!g){renderRoomLobby();return;} const body=$('#nxgBody');
  const score=state.players.map(p=>`${esc(p.name)}: ${state.scores[p.id]||0}`).join(' • ');
  body.innerHTML=`<div class="nxg-meta"><span class="nxg-pill">${g.emoji} ${esc(g.name)}</span><span class="nxg-pill">ROOM ${room.code}</span><span class="nxg-pill">${state.players.length}/${g.max} PLAYERS</span><span class="nxg-pill">${score}</span></div><div class="nxg-board" id="nxgBoard"></div>`;
  renderGameBoard(g);
}
function boardStatus(text){return `<div class="nxg-status">${esc(text)}</div>`}
function renderGameBoard(g){
  const b=$('#nxgBoard'); if(!b)return;
  if(g.id==='ttt'){const turn=state.players[state.turn]?.id; b.innerHTML=boardStatus(turn===me.id?'YOUR TURN':`${esc(state.players[state.turn]?.name||'Player')} turn`)+`<div class="nxg-ttt">${state.board.map((x,i)=>`<button class="nxg-cell" data-i="${i}">${x||''}</button>`).join('')}</div><div class="nxg-toast">X and O are assigned by player order.</div>`;b.querySelectorAll('[data-i]').forEach(x=>x.onclick=()=>action('ttt_move',{index:+x.dataset.i}));return;}
  if(g.id==='c4'){const turn=state.players[state.turn]?.id;b.innerHTML=boardStatus(turn===me.id?'YOUR DROP':`${esc(state.players[state.turn]?.name||'Player')} turn`)+`<div class="nxg-c4">${state.board.flatMap((row,r)=>row.map((x,c)=>`<button class="slot" data-c="${c}" aria-label="column ${c+1}"><span class="disc" data-v="${x||''}"></span></button>`)).join('')}</div>`;b.querySelectorAll('[data-c]').forEach(x=>x.onclick=()=>action('c4_drop',{col:+x.dataset.c}));b.querySelectorAll('.disc').forEach(x=>{const v=x.dataset.v;x.style.background=v==='A'?'#7c6cff':v==='B'?'#5de6a2':''});return;}
  if(g.id==='rps'){const turnCount=Object.keys(state.submissions||{}).length;b.innerHTML=boardStatus(`${turnCount}/${state.players.length} choices submitted`)+`<div class="nxg-rps"><button class="nxg-choice" data-v="rock">✊ Rock</button><button class="nxg-choice" data-v="paper">✋ Paper</button><button class="nxg-choice" data-v="scissors">✌️ Scissors</button></div>`;b.querySelectorAll('[data-v]').forEach(x=>x.onclick=()=>action('rps_choose',{choice:x.dataset.v}));return;}
  if(g.id==='reaction'){b.innerHTML=boardStatus('Wait for the target, then click as fast as you can!')+`<div class="nxg-big" id="nxgTarget">${state.target?'GO!':'READY'}</div><div style="margin-top:16px"><button class="nxg-btn" id="nxgReact">${state.target?'CLICK!':'WAIT'}</button></div>`;$('#nxgReact').onclick=()=>action('reaction_click',{at:Date.now()}); if(isHost()&&!state.target){setTimeout(()=>{state.target=1;send('state',safeSnapshot());renderGame();},1500+Math.random()*2200)}return;}
  if(g.id==='quiz'){const q=state.question;b.innerHTML=boardStatus(`Round ${state.round+1}`)+`<div class="nxg-question">${esc(q.q)}</div><div class="nxg-answers">${q.a.map((a,i)=>`<button class="nxg-answer" data-i="${i}">${esc(a)}</button>`).join('')}</div>`;b.querySelectorAll('[data-i]').forEach(x=>x.onclick=()=>action('quiz_answer',{index:+x.dataset.i}));return;}
  if(g.id==='number'){b.innerHTML=boardStatus(`Target: ${state.target}`)+`<div class="nxg-number">${[10,25,50,75,100].map(v=>`<button class="nxg-btn ghost nxg-num" data-v="${v}">${v}</button>`).join('')}</div><div class="nxg-row" style="margin-top:14px;max-width:420px;width:100%"><input class="nxg-input" id="nxgNumber" type="number" min="1" max="100" placeholder="Your number 1–100"><button class="nxg-btn" id="nxgNumSend">LOCK</button></div>`;b.querySelectorAll('[data-v]').forEach(x=>x.onclick=()=>$('#nxgNumber').value=x.dataset.v);$('#nxgNumSend').onclick=()=>{const v=Number($('#nxgNumber').value);if(v>=1&&v<=100)action('number_submit',{value:v});};return;}
  if(g.id==='word'){const tail=state.chain[state.chain.length-1]||'';const need=tail?tail.slice(-1).toLowerCase():'';b.innerHTML=boardStatus(need?`Word must start with: ${need.toUpperCase()}`:'Start the chain!')+`<div class="nxg-chain">${state.chain.slice(-8).map(x=>esc(x)).join(' → ')||'—'}</div><div class="nxg-word"><input id="nxgWord" class="nxg-input" placeholder="Enter a word"><button id="nxgWordSend" class="nxg-btn">PLAY</button></div>`;$('#nxgWordSend').onclick=()=>{const v=$('#nxgWord').value.trim().toLowerCase();if(v)action('word_play',{word:v});};return;}
  if(g.id==='memory'){b.innerHTML=boardStatus(`Matched ${state.matched.length/2}/${state.memory.length/2}`)+`<div class="nxg-memory">${state.memory.map((v,i)=>`<button class="${state.flipped.includes(i)||state.matched.includes(i)?'open':''}" data-i="${i}">${state.flipped.includes(i)||state.matched.includes(i)?v:'?'}</button>`).join('')}</div>`;b.querySelectorAll('[data-i]').forEach(x=>x.onclick=()=>action('memory_flip',{index:+x.dataset.i}));}
}

const QUIZ=[
 ['Which planet is known as the Red Planet?',['Earth','Mars','Venus','Jupiter'],1],
 ['Which language runs in a browser?',['Python','JavaScript','C++','Rust'],1],
 ['What does CPU stand for?',['Central Processing Unit','Computer Power Unit','Core Program Utility','Central Program User'],0],
 ['Which protocol powers typical web pages?',['HTTP','FTP','SMTP','SSH'],0],
 ['How many bits are in one byte?',['4','8','16','32'],1],
 ['What is 12 × 8?',['84','96','108','112'],1],
 ['Which is a database?',['PostgreSQL','Photoshop','PowerPoint','Premiere'],0],
];
function nextQuizQuestion(){const x=QUIZ[Math.floor(Math.random()*QUIZ.length)];state.question={q:x[0],a:x[1],correct:x[2]};state.round=(state.round||0)+1;state.submissions={};}
function initMemory(){const base=['🚀','🚀','⚡','⚡','🎯','🎯','🧠','🧠'];state.memory=base.sort(()=>Math.random()-.5);state.matched=[];state.flipped=[];}
function handleAction(a){
  if(!a||state.phase!=='playing')return;
  if(a.type==='ttt_move')return tttMove(a);
  if(a.type==='c4_drop')return c4Move(a);
  if(a.type==='rps_choose')return rpsMove(a);
  if(a.type==='reaction_click')return reactionMove(a);
  if(a.type==='quiz_answer')return quizMove(a);
  if(a.type==='number_submit')return numberMove(a);
  if(a.type==='word_play')return wordMove(a);
  if(a.type==='memory_flip')return memoryMove(a);
}
function finish(winnerId=null,message='Game over'){state.phase='results';state.winner=winnerId;state.winnerMessage=message;send('state',safeSnapshot());renderResults();}
function nextTurn(){state.turn=(state.turn+1)%state.players.length;send('state',safeSnapshot());renderGame();}
function tttWin(board,p){const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];return wins.some(w=>w.every(i=>board[i]===p));}
function tttMove(a){if(a.playerId!==state.players[state.turn]?.id||state.board[a.index])return;const p=state.turn===0?'X':'O';state.board[a.index]=p;if(tttWin(state.board,p)){state.scores[a.playerId]++;return finish(a.playerId,`${state.players[state.turn].name} wins!`);}if(state.board.every(Boolean))return finish(null,'Draw!');nextTurn();}
function c4Move(a){if(a.playerId!==state.players[state.turn]?.id)return;const c=a.col;for(let r=5;r>=0;r--){if(!state.board[r][c]){state.board[r][c]=state.turn===0?'A':'B';if(c4Win(r,c,state.board[r][c])){state.scores[a.playerId]++;return finish(a.playerId,`${state.players[state.turn].name} connects four!`);}if(state.board.every(row=>row.every(Boolean)))return finish(null,'Board full!');nextTurn();return;}}}
function c4Win(r,c,p){const dirs=[[1,0],[0,1],[1,1],[1,-1]];return dirs.some(([dr,dc])=>1+countDir(r,c,dr,dc,p)+countDir(r,c,-dr,-dc,p)>=4)}
function countDir(r,c,dr,dc,p){let n=0,rr=r+dr,cc=c+dc;while(rr>=0&&rr<6&&cc>=0&&cc<7&&state.board[rr][cc]===p){n++;rr+=dr;cc+=dc}return n}
function rpsMove(a){if(state.submissions[a.playerId])return;state.submissions[a.playerId]=a.choice;if(Object.keys(state.submissions).length<state.players.length){send('state',safeSnapshot());renderGame();return;}const vals=state.players.map(p=>state.submissions[p.id]);const unique=new Set(vals);if(unique.size===1)return finish(null,'Everyone matched — draw!');const beats={rock:'scissors',paper:'rock',scissors:'paper'};const winners=state.players.filter(p=>state.players.every(o=>o.id===p.id||beats[state.submissions[p.id]]===state.submissions[o.id]));if(winners.length===1){state.scores[winners[0].id]++;return finish(winners[0].id,`${winners[0].name} wins the round!`)}finish(null,'Round complete!');}
function reactionMove(a){if(!state.target)return;if(state.winner)return;const elapsed=a.at-state.startedAt;const best=state.bestTime||Infinity;if(elapsed<best){state.bestTime=elapsed;state.winner=a.playerId;state.scores[a.playerId]++;state.winnerMessage=`${state.players.find(p=>p.id===a.playerId)?.name||'Player'} reacted in ${elapsed}ms`;state.phase='results';send('state',safeSnapshot());renderResults();}}
function quizMove(a){if(state.submissions[a.playerId]!=null)return;state.submissions[a.playerId]=a.index;if(a.index===state.question.correct)state.scores[a.playerId]++;if(Object.keys(state.submissions).length>=state.players.length){if(state.round>=5)return finish(topScorer(),'Quiz complete!');nextQuizQuestion();send('state',safeSnapshot());renderGame();}}
function topScorer(){return state.players.slice().sort((a,b)=>(state.scores[b.id]||0)-(state.scores[a.id]||0))[0]?.id||null}
function numberMove(a){if(state.submissions[a.playerId]!=null)return;state.submissions[a.playerId]=a.value;if(Object.keys(state.submissions).length<state.players.length){send('state',safeSnapshot());renderGame();return;}const ranked=state.players.map(p=>({id:p.id,d:Math.abs(aValue(p.id)-state.target)})).sort((x,y)=>x.d-y.d);const win=ranked[0];state.scores[win.id]++;state.round++;if(state.round>=5)return finish(win.id,`${state.players.find(p=>p.id===win.id)?.name} wins Number Clash!`);state.target=Math.floor(Math.random()*100)+1;state.submissions={};send('state',safeSnapshot());renderGame();}
function aValue(id){return Number(state.submissions[id]??999)}
function wordMove(a){if(state.submissions[a.playerId])return;const w=String(a.word||'').toLowerCase().replace(/[^a-z]/g,'');if(w.length<2)return;const tail=state.chain[state.chain.length-1]||'';if(tail&&w[0]!==tail.slice(-1))return;state.submissions[a.playerId]=w;state.chain.push(w);state.turn=(state.turn+1)%state.players.length;state.submissions={};send('state',safeSnapshot());renderGame();}
function memoryMove(a){const i=a.index;if(state.flipped.includes(i)||state.matched.includes(i))return;state.flipped=[...state.flipped,i];if(state.flipped.length===2){const [x,y]=state.flipped;if(state.memory[x]===state.memory[y]){state.matched.push(x,y);state.scores[a.playerId]++;state.flipped=[];}else{setTimeout(()=>{if(!isHost())return;state.flipped=[];send('state',safeSnapshot());renderGame();},750)}}send('state',safeSnapshot());renderGame();if(state.matched.length===state.memory.length)return finish(topScorer(),'Memory Match complete!');}
function renderResults(){openOverlay();const winnerName=state.winner?state.players.find(p=>p.id===state.winner)?.name:'No single winner';$('#nxgBody').innerHTML=`<div class="nxg-board"><div class="nxg-big">🏆</div><h2>${esc(winnerName||'Game complete')}</h2><div class="nxg-status">${esc(state.winnerMessage||'Nice game!')}</div><div class="nxg-meta">${state.players.map(p=>`<span class="nxg-pill">${esc(p.name)} · ${state.scores[p.id]||0}</span>`).join('')}</div><div class="nxg-row"><button class="nxg-btn" id="nxgAgain">Play again</button><button class="nxg-btn ghost" id="nxgBack">Game hub</button></div></div>`;$('#nxgAgain').onclick=()=>{if(isHost())startGame();};$('#nxgBack').onclick=()=>{leaveRoom();renderHub();};}
function showRoomChat(p){console.log('[NEXUS game chat]',p)}
async function leaveRoom(silent=false){if(roomChannel&&sb){try{await roomChannel.untrack()}catch{};try{await sb.removeChannel(roomChannel)}catch{}}roomChannel=null;room=null;Object.assign(state,{game:null,phase:'lobby',players:[],board:null,scores:{},winner:null,ready:{}});$('#nxGamesOverlay')?.classList.remove('show');if(!silent)renderHub();}
function installButton(){
  if($('#nxGamesBtn'))return;
  const nav=document.querySelector('.nav-groups .nav-group');
  if(!nav)return;
  const b=document.createElement('button');b.id='nxGamesBtn';b.className='nav-item';b.innerHTML='🎮 <span>Games</span>';b.onclick=renderHub;nav.appendChild(b);
}
function boot(){styles();installButton();window.NEXUS_GAMES={open:renderHub,leave:leaveRoom};}
window.addEventListener('load',boot);setTimeout(boot,500);
