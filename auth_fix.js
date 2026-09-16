// NEXUS authentication runtime fix.
// Owns the auth form so signup/sign-in cannot be double-handled by app.js.
import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) => {
  const config = window.NEXUS_SUPABASE || {};
  if (!config.url || !config.publishableKey) return;

  const supabase = createClient(config.url, config.publishableKey);
  const form = document.querySelector('#authForm');
  const usernameInput = document.querySelector('#authUsername');
  const emailInput = document.querySelector('#authEmail');
  const passwordInput = document.querySelector('#authPassword');
  const submitButton = document.querySelector('#authSubmit');
  const switchButton = document.querySelector('#authSwitch');
  const note = document.querySelector('#authNote');

  if (!form || !usernameInput || !emailInput || !passwordInput || !submitButton || !switchButton || !note) return;

  const isSignup = () => switchButton.textContent.includes('Already have an account');

  const syncValidation = () => {
    const signup = isSignup();
    usernameInput.required = signup;
    usernameInput.disabled = !signup;
    passwordInput.autocomplete = signup ? 'new-password' : 'current-password';
  };

  const showNote = (message, error = false) => {
    note.textContent = message;
    note.classList.toggle('error', error);
  };

  syncValidation();
  switchButton.addEventListener('click', () => queueMicrotask(syncValidation));

  // Capture first so the legacy app.js submit listener cannot run a second auth request.
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    syncValidation();

    const signup = isSignup();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const username = usernameInput.value.trim();

    if (!email) return showNote('Enter your email address.', true);
    if (password.length < 6) return showNote('Password must be at least 6 characters.', true);
    if (signup && username.length < 2) return showNote('Username must be at least 2 characters.', true);

    submitButton.disabled = true;
    submitButton.textContent = signup ? 'Creating…' : 'Signing in…';
    showNote('Connecting to NEXUS…');

    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } }
        });

        if (error) throw error;

        if (data.session) {
          showNote('Account created. Loading NEXUS…');
          window.location.reload();
          return;
        }

        // Email confirmation is enabled: the account is created but needs confirmation.
        switchButton.click();
        showNote('Account created. Check your email, confirm it, then sign in.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) throw new Error('Sign-in completed without a session. Please try again.');

      showNote('Signed in. Loading NEXUS…');
      window.location.reload();
    } catch (error) {
      console.error('[NEXUS auth]', error);
      const message = error?.message || 'Authentication failed.';
      showNote(message, true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = isSignup() ? 'Create account' : 'Sign in';
    }
  }, true);
});