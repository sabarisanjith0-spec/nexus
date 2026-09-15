import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const toast = (t) => {
  const el = $('#toast');
  el.textContent = t;
  el.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => el.classList.remove('show'), 2200);
};

const titles = {
  general: 'The main transmission channel',
  showcase: 'Show what you are building',
  builds: 'Build logs and experiments',
  random: 'Everything else'
};

const config = window.NEXUS_SUPABASE || {};
const configured = Boolean(config.url && config.publishableKey);
const supabase = configured ? createClient(config.url, config.publishableKey) : null;
let session = null;
let currentChannel = 'general';
let channelMap = new Map();
let realtimeChannel = null;
let authMode = 'signup';

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

function setStatus(text, live = false) {
  $('#connectionStatus').textContent = text;
  $('#connectionStatus').previousElementSibling?.classList.toggle('status-live', live);
}

function showAuth(show = true) {
  $('#authOverlay').hidden = !show;
}

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === 'signup';
  $('#authTitle').textContent = signup ? 'Join NEXUS' : 'Welcome back';
  $('#authSubtitle').textContent = signup ? 'Create an account to enter the live group chat.' : 'Sign in to continue to your NEXUS conversations.';
  $('#usernameField').style.display = signup ? 'grid' : 'none';
  $('#authSubmit').textContent = signup ? 'Create account' : 'Sign in';
  $('#authSwitch').textContent = signup ? 'Already have an account? Sign in' : 'New here? Create an account';
  $('#authPassword').autocomplete = signup ? 'new-password' : 'current-password';
  $('#authNote').textContent = '';
}

function renderMessage(message) {
  const article = document.createElement('article');
  article.className = 'message';
  const username = message.profiles?.username || 'User';
  const initial = username.slice(0, 1).toUpperCase();
  const time = new Date(message.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' });
  article.innerHTML = `
    <div class="message-row">
      <div class="avatar av-cyan">${escapeHtml(initial)}<span></span></div>
      <div class="message-body">
        <div class="meta"><strong>${escapeHtml(username)}</strong><span>${escapeHtml(time)}</span></div>
        <p>${escapeHtml(message.body).replace(/\n/g, '<br>')}</p>
        <div class="reaction-row"><button>⚡ 0</button><button>❤️ 0</button><button class="add-reaction">+</button></div>
      </div>
    </div>`;
  bindReactions(article);
  $('#feed').appendChild(article);
  return article;
}

function renderEmpty() {
  $('#feed').innerHTML = `<div class="empty-state"><div class="hero-tag">LIVE CHANNEL</div><h3>No transmissions yet.</h3><p>Be the first person to send a message in #${escapeHtml(currentChannel)}.</p></div>`;
}

function bindReactions(root = document) {
  root.querySelectorAll('.reaction-row button:not(.add-reaction)').forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const match = btn.textContent.match(/(\d+)$/);
      if (match) btn.textContent = btn.textContent.replace(/\d+$/, String(Number(match[1]) + 1));
      btn.animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}], {duration:220});
    });
  });
  root.querySelectorAll('.add-reaction').forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => { btn.textContent = '⚡'; btn.classList.remove('add-reaction'); toast('Reaction added'); });
  });
}

async function ensureProfile(user, username) {
  const clean = (username || user.user_metadata?.username || `user_${user.id.replaceAll('-', '').slice(0, 10)}`).trim().slice(0, 24);
  const { error } = await supabase.from('profiles').upsert({ id: user.id, username: clean }, { onConflict: 'id' });
  if (error) throw error;
  $('#currentUsername').textContent = clean;
  $('#currentEmail').textContent = user.email || '';
  return clean;
}

async function loadChannels() {
  const { data, error } = await supabase.from('channels').select('id,name').order('name');
  if (error) throw error;
  channelMap = new Map((data || []).map((row) => [row.name, row.id]));
  const list = $('#channelList');
  list.innerHTML = '';
  (data || []).forEach((row) => {
    const btn = document.createElement('button');
    btn.className = `channel ${row.name === currentChannel ? 'active' : ''}`;
    btn.dataset.channel = row.name;
    btn.innerHTML = `<span>#</span> ${escapeHtml(row.name)}`;
    btn.addEventListener('click', () => switchChannel(row.name));
    list.appendChild(btn);
  });
}

async function loadMessages() {
  const channelId = channelMap.get(currentChannel);
  if (!channelId) { renderEmpty(); return; }
  const { data, error } = await supabase
    .from('messages')
    .select('id,body,created_at,user_id,profiles(username)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  $('#feed').innerHTML = '';
  if (!data?.length) { renderEmpty(); return; }
  data.forEach(renderMessage);
  $('#feed').scrollTop = $('#feed').scrollHeight;
}

function subscribeRealtime() {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase
    .channel('nexus-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
      const row = payload.new;
      const channelId = channelMap.get(currentChannel);
      if (row.channel_id !== channelId || document.querySelector(`[data-message-id="${row.id}"]`)) return;
      const { data } = await supabase.from('profiles').select('username').eq('id', row.user_id).maybeSingle();
      const article = renderMessage({ ...row, profiles: data });
      article.dataset.messageId = row.id;
      $('#feed').scrollTo({ top: $('#feed').scrollHeight, behavior: 'smooth' });
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') setStatus('Live sync', true);
    });
}

async function switchChannel(name) {
  currentChannel = name;
  $$('.channel').forEach((x) => x.classList.toggle('active', x.dataset.channel === name));
  $('#channelTitle').textContent = name;
  $('#channelSubtitle').textContent = titles[name] || 'NEXUS community channel';
  $('#messageInput').placeholder = `Message #${name}`;
  toast(`Switched to #${name}`);
  if (session) {
    try { await loadMessages(); } catch (error) { toast(error.message); }
  }
}

async function sendMessage(text) {
  if (!session) return showAuth(true);
  const channelId = channelMap.get(currentChannel);
  if (!channelId) return toast('Channel not available');
  const { error } = await supabase.from('messages').insert({ channel_id: channelId, user_id: session.user.id, body: text });
  if (error) throw error;
}

async function boot() {
  if (!configured) {
    setStatus('Backend not configured');
    $('#memberStat').textContent = 'SETUP';
    $('#onlineStat').textContent = 'DEMO';
    $('#feed').innerHTML = `<div class="empty-state"><div class="hero-tag">BACKEND REQUIRED</div><h3>NEXUS is ready for real chat.</h3><p>Add your Supabase project URL and Publishable Key to <code>supabase-config.js</code>, then run <code>supabase.sql</code>.</p></div>`;
    showAuth(false);
    return;
  }

  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
    if (!session) {
      setStatus('Sign in required');
      showAuth(true);
      return;
    }
    await afterAuth();
  } catch (error) {
    setStatus('Backend error');
    toast(error.message);
  }

  supabase.auth.onAuthStateChange(async (_event, nextSession) => {
    session = nextSession;
    if (session) {
      showAuth(false);
      try { await afterAuth(); } catch (error) { toast(error.message); }
    } else {
      showAuth(true);
      setStatus('Signed out');
    }
  });
}

async function afterAuth() {
  const username = session.user.user_metadata?.username;
  await ensureProfile(session.user, username);
  await loadChannels();
  await loadMessages();
  subscribeRealtime();
  $('#messageInput').disabled = false;
  setStatus('Live sync', true);
  $('#authNote').textContent = '';
}

$('#authForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase) return;
  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;
  const username = $('#authUsername').value.trim();
  $('#authSubmit').disabled = true;
  $('#authNote').textContent = 'Connecting…';
  try {
    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
      if (error) throw error;
      if (!data.session) {
        $('#authNote').textContent = 'Check your email to confirm your account, then sign in.';
        setAuthMode('signin');
      } else {
        $('#authNote').textContent = 'Account created. Opening NEXUS…';
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (error) {
    $('#authNote').textContent = error.message;
  } finally {
    $('#authSubmit').disabled = false;
  }
});

$('#authSwitch').addEventListener('click', () => setAuthMode(authMode === 'signup' ? 'signin' : 'signup'));
$('#signOutBtn').addEventListener('click', async () => { if (supabase) await supabase.auth.signOut(); });
$('#themeBtn').addEventListener('click', () => { document.body.classList.toggle('warm'); toast(document.body.classList.contains('warm') ? 'Cyan signal enabled' : 'Violet signal enabled'); });
$$('.server').forEach((btn) => btn.addEventListener('click', () => { $$('.server').forEach((x) => x.classList.remove('active')); btn.classList.add('active'); toast(`${btn.dataset.server} network selected`); }));
$('.voice-call button')?.addEventListener('click', (btn) => { btn.textContent = 'Joined'; btn.disabled = true; });

$('#messageForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#messageInput');
  const text = input.value.trim();
  if (!text) return;
  try {
    await sendMessage(text);
    input.value = '';
    toast('Transmission sent');
  } catch (error) {
    toast(error.message);
  }
});

$('#searchInput').addEventListener('input', (event) => {
  const q = event.target.value.toLowerCase().trim();
  $$('.message').forEach((m) => { m.style.display = !q || m.textContent.toLowerCase().includes(q) ? '' : 'none'; });
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#searchInput').focus(); }
});

$('#addChannel').addEventListener('click', () => toast('Channel creation is coming next — the chat core is live first.'));

setAuthMode('signup');
boot();
