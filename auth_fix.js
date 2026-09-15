// NEXUS auth form validation fix.
// The username field is required for signup but must not block sign-in.
const usernameInput = document.querySelector('#authUsername');
const authSwitchButton = document.querySelector('#authSwitch');
const authForm = document.querySelector('#authForm');

function syncAuthValidation() {
  if (!usernameInput || !authSwitchButton) return;
  const signingUp = authSwitchButton.textContent.includes('Already have an account');
  usernameInput.required = signingUp;
  usernameInput.disabled = !signingUp;
}

syncAuthValidation();
authSwitchButton?.addEventListener('click', () => queueMicrotask(syncAuthValidation));
authForm?.addEventListener('submit', () => syncAuthValidation(), true);
