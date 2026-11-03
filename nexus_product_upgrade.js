/* NEXUS PRODUCT LAYER — clean navigation, one launchpad, and keyboard access. */
(() => {
  'use strict';

  const NAV_IDS = [
    'nxGamesBtn',
    'arcadeBtn',
    '3dGamesBtn',
    'expansionArcadeBtn',
    'gameVaultBtn',
    'ultraGamesBtn',
    'gameDirectorBtn'
  ];

  const LAUNCHERS = [
    {name:'Multiplayer Game Hub',detail:'Create a room and play realtime games with friends.',icon:'🎮',group:'MULTIPLAYER',api:'NEXUS_GAMES',fallback:'#nxGamesBtn'},
    {name:'NEXUS Arcade',detail:'Fast original mini-games and curated browser games.',icon:'🕹️',group:'ARCADE',api:'NEXUS_ARCADE',fallback:'#arcadeBtn'},
    {name:'3D Arcade',detail:'Explore interactive Three.js game experiments.',icon:'🧊',group:'3D WORLDS',api:'NEXUS_3D',fallback:'#3dGamesBtn'},
    {name:'3D Worlds+',detail:'Open-world prototypes, social play and expanded experiences.',icon:'🌌',group:'3D WORLDS',api:'NEXUS_EXPANSION',fallback:'#expansionArcadeBtn'},
    {name:'Game Vault',detail:'Discover polished originals and selected open-source games.',icon:'✨',group:'GAME LIBRARY',api:'NEXUS_GAME_VAULT',fallback:'#gameVaultBtn'},
    {name:'Ultra Arcade',detail:'Action games with combos, progression and effects.',icon:'⚡',group:'GAME LIBRARY',api:'NEXUS_ULTRA',fallback:'#ultraGamesBtn'},
    {name:'Game Director',detail:'Deeper game loops, quality presets and performance controls.',icon:'🎯',group:'GAME LIBRARY',api:'NEXUS_GAME_DIRECTOR',fallback:'#gameDirectorBtn'},
    {name:'NEXUS Infinity',detail:'Global search, saved vault, focus mode and workspace tools.',icon:'∞',group:'WORKSPACE TOOLS',api:'NEXUS_INFINITY',fallback:'#nxInfinityBtn'},
    {name:'NEXUS MAX',detail:'Drafts, unread activity, diagnostics and power tools.',icon:'⌘',group:'WORKSPACE TOOLS',fallback:'#nxmMaxBtn'}
  ];

  let overlay;
  let lastFocus = null;

  const $ = (selector, root=document) => root.querySelector(selector);
  const toast = (message) => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(window.__nxProductToast);
    window.__nxProductToast = setTimeout(() => el.classList.remove('show'), 2400);
  };

  function launch(item) {
    try {
      const api = item.api ? window[item.api] : null;
      if (api && typeof api.open === 'function') {
        api.open();
        closeLabs();
        return;
      }
      const fallback = item.fallback ? $(item.fallback) : null;
      if (fallback) {
        closeLabs();
        fallback.click();
        return;
      }
      toast(item.name + ' is still loading. Refresh once and try again.');
    } catch (error) {
      console.error('[NEXUS] Launcher error:', item.name, error);
      toast('Could not open ' + item.name + '. Please try again.');
    }
  }

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'nxpLabsOverlay';
    overlay.className = 'nxp-labs-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<section class="nxp-labs-panel" role="dialog" aria-modal="true" aria-labelledby="nxpLabsTitle" tabindex="-1">' +
        '<header class="nxp-labs-head">' +
          '<div><h2 id="nxpLabsTitle">NEXUS Launchpad</h2><p>One entry point for games, worlds and workspace tools.</p></div>' +
          '<button class="nxp-labs-close" type="button" aria-label="Close launchpad">×</button>' +
        '</header>' +
        '<div class="nxp-labs-tools"><input id="nxpLabsSearch" type="search" placeholder="Find a tool or game…" autocomplete="off" aria-label="Search NEXUS tools"><span>CTRL + SHIFT + L</span></div>' +
        '<div class="nxp-launcher-grid" id="nxpLauncherGrid"></div>' +
      '</section>';
    document.body.appendChild(overlay);

    $('.nxp-labs-close', overlay).addEventListener('click', closeLabs);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeLabs();
    });
    $('#nxpLabsSearch', overlay).addEventListener('input', renderLaunchers);
    $('.nxp-labs-panel', overlay).addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const focusable = [...overlay.querySelectorAll('button:not([hidden]),input:not([hidden])')];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });
    return overlay;
  }

  function renderLaunchers() {
    if (!overlay) return;
    const query = ($('#nxpLabsSearch', overlay)?.value || '').trim().toLowerCase();
    const grid = $('#nxpLauncherGrid', overlay);
    const items = LAUNCHERS.filter(item =>
      (item.name + ' ' + item.detail + ' ' + item.group).toLowerCase().includes(query)
    );
    grid.innerHTML = items.map((item, index) =>
      '<button class="nxp-launch-card" type="button" data-launch-index="' + LAUNCHERS.indexOf(item) + '">' +
        '<span class="nxp-launch-icon" aria-hidden="true">' + item.icon + '</span>' +
        '<span class="nxp-launch-copy"><strong>' + item.name + '</strong><small>' + item.detail + '</small></span>' +
      '</button>'
    ).join('') || '<div class="nxp-labs-empty">No tools match that search. Try another name.</div>';

    grid.querySelectorAll('[data-launch-index]').forEach(button => {
      button.addEventListener('click', () => launch(LAUNCHERS[Number(button.dataset.launchIndex)]));
    });
  }

  function openLabs() {
    lastFocus = document.activeElement;
    createOverlay();
    renderLaunchers();
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nxp-labs-open');
    requestAnimationFrame(() => {
      $('.nxp-labs-panel', overlay)?.focus();
      $('#nxpLabsSearch', overlay)?.focus();
    });
  }

  function closeLabs() {
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nxp-labs-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function installHeadShortcut() {
    const head = $('.workspace-head');
    if (!head || $('.nxp-head-labs', head)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nxp-head-labs';
    button.textContent = 'LABS';
    button.setAttribute('aria-label', 'Open NEXUS Launchpad');
    button.title = 'Open NEXUS Launchpad (Ctrl+Shift+L)';
    button.addEventListener('click', openLabs);
    const menu = $('.icon-btn', head);
    if (menu) head.insertBefore(button, menu);
    else head.appendChild(button);
  }

  function assembleNavigation() {
    const root = $('.nav-groups');
    const primary = $('.nav-group', root || document);
    if (!root || !primary) return;

    let labs = $('.nxp-labs-group', root);
    if (!labs) {
      labs = document.createElement('div');
      labs.className = 'nav-group nxp-labs-group';
      labs.innerHTML = '<div class="group-title">GAME LABS</div>';
      if (primary.nextSibling) root.insertBefore(labs, primary.nextSibling);
      else root.appendChild(labs);
    }

    NAV_IDS.forEach(id => {
      const button = document.getElementById(id);
      if (button && button.parentElement !== labs) labs.appendChild(button);
    });

    let mobileTrigger = $('.nxp-labs-trigger', primary);
    if (!mobileTrigger) {
      mobileTrigger = document.createElement('button');
      mobileTrigger.type = 'button';
      mobileTrigger.className = 'nav-item nxp-labs-trigger';
      mobileTrigger.innerHTML = '🧪 <span>Labs</span>';
      mobileTrigger.setAttribute('aria-label', 'Open NEXUS Launchpad');
      mobileTrigger.addEventListener('click', openLabs);
      primary.appendChild(mobileTrigger);
    }

    installHeadShortcut();
  }

  function bindGlobalShortcuts() {
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay?.classList.contains('show')) {
        closeLabs();
        return;
      }
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        openLabs();
      }
    });
  }

  function init() {
    bindGlobalShortcuts();
    assembleNavigation();
    window.addEventListener('load', () => {
      assembleNavigation();
      setTimeout(assembleNavigation, 650);
      setTimeout(assembleNavigation, 1250);
    }, { once: true });
    setTimeout(assembleNavigation, 900);
    window.NEXUS_PRODUCT = { openLabs, closeLabs, assembleNavigation };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();