/**
 * IMovies – Auth Module: Login, Register, Logout
 */
const Auth = (() => {

  /* ── Open modal ─────────────────────────────────────── */
  function openModal(tab = 'login') {
    document.getElementById('auth-modal-overlay').classList.remove('hidden');
    switchTab(tab);
  }

  /* ── Close modal ────────────────────────────────────── */
  function closeModal(event) {
    // Allow closing via: overlay click, ✕ button (no event arg), or Escape key
    if (event && event.target !== document.getElementById('auth-modal-overlay')) return;
    document.getElementById('auth-modal-overlay').classList.add('hidden');
    _clearErrors();
  }

  /* ── Tab switch ─────────────────────────────────────── */
  function switchTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('tab-login').classList.toggle('active',    isLogin);
    document.getElementById('tab-register').classList.toggle('active', !isLogin);
    document.getElementById('login-form').classList.toggle('hidden',    !isLogin);
    document.getElementById('register-form').classList.toggle('hidden',  isLogin);
    _clearErrors();
  }

  /* ── Login ──────────────────────────────────────────── */
  async function handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-submit');

    _setLoading(btn, true, 'Logging in…');
    _hideError('login-error');

    try {
      const { token, user } = await App.api('POST', '/auth/login', { email, password });
      App.setAuth(token, user);
      document.getElementById('auth-modal-overlay').classList.add('hidden');
      document.getElementById('login-form').reset();
      App.showToast(`Welcome back, ${user.name.split(' ')[0]}! 🎬`);
    } catch (err) {
      _showError('login-error', err.message);
    } finally {
      _setLoading(btn, false, 'Login');
    }
  }

  /* ── Register ───────────────────────────────────────── */
  async function handleRegister(e) {
    e.preventDefault();
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const btn      = document.getElementById('register-submit');

    _setLoading(btn, true, 'Creating account…');
    _hideError('register-error');

    try {
      const { token, user } = await App.api('POST', '/auth/register', { name, email, password });
      App.setAuth(token, user);
      document.getElementById('auth-modal-overlay').classList.add('hidden');
      document.getElementById('register-form').reset();
      App.showToast(`Welcome to IMovies, ${user.name.split(' ')[0]}! 🎉`);
    } catch (err) {
      _showError('register-error', err.message);
    } finally {
      _setLoading(btn, false, 'Create Account');
    }
  }

  /* ── Logout ─────────────────────────────────────────── */
  function logout() {
    App.clearAuth();
    App.navigate('home');
    App.showToast('Logged out successfully.');
  }

  /* ── Private helpers ────────────────────────────────── */
  function _showError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function _hideError(id) {
    const el = document.getElementById(id);
    el.classList.add('hidden');
  }
  function _clearErrors() {
    _hideError('login-error');
    _hideError('register-error');
  }
  function _setLoading(btn, loading, text) {
    btn.disabled     = loading;
    btn.textContent  = text;
  }

  return { openModal, closeModal, switchTab, handleLogin, handleRegister, logout };
})();
