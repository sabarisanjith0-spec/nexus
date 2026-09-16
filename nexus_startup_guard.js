// NEXUS STARTUP GUARD — keep game overlays closed until the user explicitly interacts.
(() => {
  let userIntent = false;

  const markIntent = () => {
    userIntent = true;
  };

  window.addEventListener('pointerdown', markIntent, { once: true, capture: true });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') userIntent = true;
  }, { once: true, capture: true });

  const hideOverlays = () => {
    ['nxaOverlay', 'nxqOverlay', 'nxuOverlay', 'nxdOverlay'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('show');
    });
  };

  // Some game layers can be initialized by other scripts during page startup.
  // Immediately close any overlay that appeared before this guard loaded.
  hideOverlays();

  // Guard the public Arcade launcher from unsolicited startup calls.
  const guardArcade = () => {
    const api = window.NEXUS_ARCADE;
    if (!api || typeof api.open !== 'function' || api.__startupGuarded) return false;

    const originalOpen = api.open;
    api.open = (...args) => {
      if (!userIntent) {
        hideOverlays();
        return false;
      }
      return originalOpen(...args);
    };
    api.__startupGuarded = true;
    return true;
  };

  if (!guardArcade()) {
    const timer = window.setInterval(() => {
      if (guardArcade()) window.clearInterval(timer);
    }, 25);
    window.setTimeout(() => window.clearInterval(timer), 3000);
  }

  // If a startup script opens Arcade slightly later, close it while no user intent exists.
  window.setTimeout(() => {
    if (!userIntent) hideOverlays();
  }, 100);
})();
