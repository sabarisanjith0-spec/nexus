import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.NEXUS_SUPABASE || {};
if (!cfg.url || !cfg.publishableKey) {
  console.info('NEXUS enhancements waiting for Supabase configuration.');
} else {
  const supabase = createClient(cfg.url, cfg.publishableKey);
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const toast = (text) => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(window.__nexusToast);
    window.__nexusToast = setTimeout(() => el.classList.remove('show'), 2200);
  };

  const style = document.createElement('style');
  style.textContent = `
    .typing-live{min-height:17px;color:#7d88a0;font-size:9px;display:flex;align-items:center;gap:7px}
    .typing-dots{display:inline-flex;gap:3px}.typing-dots i{width:4px;height:4px;border-radius:50%;background:#7c6cff;animation:nexusDot 1s infinite}.typing-dots i:nth-child(2){animation-delay:.15s}.typing-dots i:nth-child(3){animation-delay:.3s}@keyframes nexusDot{50%{transform:translateY(-3px);opacity:.55}}
    .quickbar{display:none;position:fixed;top:78px;left:50%;transform:translateX(-50%);z-index:25;width:min(560px,calc(100vw - 24px));background:rgba(12,16,27,.97);border:1px solid rgba(255,255,255,.12);border-radius:16px;box-shadow:0 30px 100px rgba(0,0,0,.6);overflow:hidden;backdrop-filter:blur(18px)}
    .quickbar.open{display:block}.quickbar-head{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:9px}.quickbar-head input{flex:1;background:transparent;border:0;outline:0;color:#eef2ff;font:600 13px Inter}.quickbar-list{max-height:340px;overflow:auto;padding:7px}.quick-item{padding:10px 11px;border-radius:9px;color:#aab3c7;display:flex;gap:10px;align-items:center;cursor:pointer}.quick-item:hover{background:#181d2b;color:#fff}.quick-item kbd{margin-left:auto;color:#66728a;font-size:9px}
    .live-badge{font-size:8px;letter-spacing:.1em;color:#68e3ae;background:#143429;border:1px solid #23533f;padding:3px 6px;border-radius:999px}
    .status-dot.status-live{background:#55e5a3}
  `;
  document.head.appendChild(style);

  const quick = document.createElement('div');
  quick.className = 'quickbar';
  quick.innerHTML = `<div class="quickbar-head"><span>⌕</span><input aria-label="Quick switch" placeholder="Jump to a channel or action…" /></div><div class="quickbar-list"></div>`;
  document.body.appendChild(quick);
  const quickInput = quick.querySelector('input');
  const quickList = quick.querySelector('.quickbar-list');

  const actions = [
    ['#', 'general', 'Jump to #general'],
    ['#', 'showcase', 'Jump to #showcase'],
    ['#', 'builds', 'Jump to #builds'],
    ['#', 'random', 'Jump to #random'],
    ['◐', 'toggle', 'Toggle visual signal'],
    ['↪', 'logout', 'Sign out']
  ];

  function renderQuick(query = '') {
    const q = query.toLowerCase().trim();
    quickList.innerHTML = '';
    actions.filter((x) => `${x[1]} ${x[2]}`.toLowerCase().includes(q)).forEach(([icon, key, label]) => {
      const row = document.createElement('div');
      row.className = 'quick-item';
      row.innerHTML = `<span>${icon}</span><span>${label}</span><kbd>${key}</kbd>`;
      row.addEventListener('click', () => {
        if (key === 'toggle') $('#themeBtn')?.click();
        else if (key === 'logout') $('#signOutBtn')?.click();
        else $(`.channel[data-channel="${key}"]`)?.click();
        quick.classList.remove('open');
      });
      quickList.appendChild(row);
    });
  }
  renderQuick();

  function openQuick() { quick.classList.add('open'); renderQuick(''); quickInput.value = ''; requestAnimationFrame(() => quickInput.focus()); }
  function closeQuick() { quick.classList.remove('open'); }
  quickInput.addEventListener('input', () => renderQuick(quickInput.value));
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); openQuick(); }
    if (e.key === 'Escape') closeQuick();
  });
  document.addEventListener('click', (e) => { if (quick.classList.contains('open') && !quick.contains(e.target)) closeQuick(); });

  let currentSession = null;
  let presenceChannel = null;
  let typingTimer = null;
  let isTyping = false;
  let typingNames = new Map();

  const setTyping = () => {
    const input = $('#messageInput');
    if (!input || !presenceChannel || !currentSession || input.disabled) return;
    const value = input.value.trim();
    if (!value) {
      if (isTyping) presenceChannel.send({ type: 'broadcast', event: 'typing', payload: { userId: currentSession.user.id, typing: false } });
      isTyping = false;
      return;
    }
    presenceChannel.send({ type: 'broadcast', event: 'typing', payload: { userId: currentSession.user.id, typing: true } });
    isTyping = true;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      isTyping = false;
      presenceChannel?.send({ type: 'broadcast', event: 'typing', payload: { userId: currentSession.user.id, typing: false } });
    }, 1800);
  };

  function renderTyping() {
    const el = $('#typing');
    if (!el) return;
    const names = [...typingNames.values()].filter(Boolean).slice(0, 2);
    if (!names.length) { el.innerHTML = ''; return; }
    const suffix = names.length === 1 ? `${names[0]} is typing` : `${names.join(' and ')} are typing`;
    el.innerHTML = `<span class="typing-live"><span class="typing-dots"><i></i><i></i><i></i></span>${suffix}…</span>`;
  }

  async function startRealtimePresence(session) {
    currentSession = session;
    if (presenceChannel) await supabase.removeChannel(presenceChannel);
    presenceChannel = supabase.channel('nexus-presence', { config: { presence: { key: session.user.id } } });
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const online = Object.keys(state).length;
        const badge = $('#memberCount');
        if (badge) badge.innerHTML = `${online} online <span class="live-badge">LIVE</span>`;
        if ($('#onlineStat')) $('#onlineStat').textContent = String(online);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || payload.userId === session.user.id) return;
        supabase.from('profiles').select('username').eq('id', payload.userId).maybeSingle().then(({ data }) => {
          if (!data) return;
          if (payload.typing) typingNames.set(payload.userId, data.username);
          else typingNames.delete(payload.userId);
          renderTyping();
        });
      });
    await presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await presenceChannel.track({ online_at: new Date().toISOString() });
    });
  }

  function bindDrafts() {
    const input = $('#messageInput');
    if (!input) return;
    const key = () => `nexus-draft:${document.querySelector('.channel.active')?.dataset.channel || 'general'}`;
    const restore = () => {
      const draft = localStorage.getItem(key()) || '';
      input.value = draft;
      if (draft) toast('Draft restored');
    };
    input.addEventListener('input', () => { localStorage.setItem(key(), input.value); setTyping(); });
    input.form?.addEventListener('submit', () => localStorage.removeItem(key()));
    document.querySelector('#channelList')?.addEventListener('click', () => setTimeout(restore, 0));
    setTimeout(restore, 400);
  }

  function tabNotifications() {
    let original = document.title;
    const onVisibility = () => { if (!document.hidden) { document.title = original; } };
    document.addEventListener('visibilitychange', onVisibility);
    return { notify: (username) => {
      if (document.hidden && 'Notification' in window) {
        const title = `${username} sent a message in NEXUS`;
        if (Notification.permission === 'granted') new Notification(title, { body: 'Open NEXUS to join the conversation.' });
        else if (Notification.permission === 'default') Notification.requestPermission().catch(() => {});
      }
      if (document.hidden) document.title = `● NEXUS · ${username}`;
    }};
  }
  const notifications = tabNotifications();

  let lastKnownSession = null;
  async function syncSession() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      lastKnownSession = data.session;
      await startRealtimePresence(data.session);
      bindDrafts();
    }
  }
  syncSession();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      lastKnownSession = session;
      await startRealtimePresence(session);
      bindDrafts();
    } else if (presenceChannel) {
      await supabase.removeChannel(presenceChannel);
      presenceChannel = null;
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    setTimeout(() => document.title === 'NEXUS — Community OS' && (document.title = 'NEXUS · Live'), 0);
  });

  window.NEXUS_ENHANCEMENTS = { notifications };
}
