/**
 * IMovies – Core App: State, Router, API, Utilities
 */
const App = (() => {
  /* ── State ──────────────────────────────────────────── */
  const state = {
    user:             null,
    token:            null,
    currentView:      'home',
    previousView:     'home',
    currentMovie:     null,
    currentShowtime:  null,
    selectedSeats:    [],
    allMovies:        [],
  };

  /* ── Bootstrap ──────────────────────────────────────── */
  function init() {
    // Restore auth from localStorage
    const savedToken = localStorage.getItem('imovies_token');
    const savedUser  = localStorage.getItem('imovies_user');
    if (savedToken && savedUser) {
      state.token = savedToken;
      state.user  = JSON.parse(savedUser);
    }

    _updateAuthUI();

    // Wire up search input
    const searchEl = document.getElementById('hero-search');
    if (searchEl) {
      searchEl.addEventListener('input', _debounce(e => {
        Movies.filterMovies({ search: e.target.value.trim() });
      }, 350));
    }

    // Wire up genre tabs
    document.getElementById('genre-tabs').addEventListener('click', e => {
      const btn = e.target.closest('.genre-tab');
      if (!btn) return;
      document.querySelectorAll('.genre-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      Movies.filterMovies({ genre: btn.dataset.genre });
    });

    navigate('home');
  }

  /* ── Navigation ─────────────────────────────────────── */
  function navigate(view, params = {}) {
    state.previousView = state.currentView;
    state.currentView  = view;

    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // Update nav link highlights
    document.querySelectorAll('.nav-link').forEach(l =>
      l.classList.toggle('active', l.dataset.view === view)
    );

    switch (view) {
      case 'home':
        document.getElementById('view-home').classList.add('active');
        Movies.loadMovies();
        break;

      case 'movie-detail':
        document.getElementById('view-movie-detail').classList.add('active');
        Movies.renderDetail(params.movie);
        break;

      case 'seat-picker':
        document.getElementById('view-seat-picker').classList.add('active');
        Booking.loadSeatPicker(params.showtime, params.movie);
        break;

      case 'profile':
        if (!state.token) { Auth.openModal('login'); return; }
        document.getElementById('view-profile').classList.add('active');
        Profile.load();
        break;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigateBack() {
    navigate(state.previousView === 'seat-picker' ? 'movie-detail' : state.previousView,
      state.currentMovie ? { movie: state.currentMovie } : {});
  }

  /* ── API helper ─────────────────────────────────────── */
  async function api(method, endpoint, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
    if (body)        opts.body = JSON.stringify(body);

    const res  = await fetch(`/api${endpoint}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
  }

  /* ── Auth helpers ───────────────────────────────────── */
  function setAuth(token, user) {
    state.token = token;
    state.user  = user;
    localStorage.setItem('imovies_token', token);
    localStorage.setItem('imovies_user',  JSON.stringify(user));
    _updateAuthUI();
  }

  function clearAuth() {
    state.token = null;
    state.user  = null;
    localStorage.removeItem('imovies_token');
    localStorage.removeItem('imovies_user');
    _updateAuthUI();
  }

  function _updateAuthUI() {
    const guest    = document.getElementById('nav-guest');
    const userEl   = document.getElementById('nav-user');
    const username = document.getElementById('nav-username');
    const avatar   = document.getElementById('nav-avatar');

    if (state.user) {
      guest.classList.add('hidden');
      userEl.classList.remove('hidden');
      username.textContent = state.user.name.split(' ')[0];
      avatar.textContent   = state.user.name[0].toUpperCase();
    } else {
      guest.classList.remove('hidden');
      userEl.classList.add('hidden');
    }
  }

  /* ── Toast ──────────────────────────────────────────── */
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast     = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.4s ease forwards';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  /* ── Utilities ──────────────────────────────────────── */
  function formatDuration(min) {
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const today    = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (dateStr === today.toISOString().slice(0,10))    return 'Today';
    if (dateStr === tomorrow.toISOString().slice(0,10)) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function getUpcomingDates(count = 7) {
    const dates = [];
    for (let i = 0; i < count; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }

  function _debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  /* ── Public API ─────────────────────────────────────── */
  return {
    state,
    init,
    navigate,
    navigateBack,
    api,
    setAuth,
    clearAuth,
    showToast,
    formatDuration,
    formatDate,
    getUpcomingDates,
  };
})();

/* Global helpers used by inline HTML event handlers */
function toggleUserDropdown() {
  document.getElementById('user-dropdown').classList.toggle('hidden');
}
function closeConfirmModal() {
  document.getElementById('confirm-modal-overlay').classList.add('hidden');
}

// Close dropdown on outside click
document.addEventListener('click', e => {
  const dropdown = document.getElementById('user-dropdown');
  const menu     = document.getElementById('user-menu');
  if (dropdown && !dropdown.classList.contains('hidden') &&
      !menu?.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

window.addEventListener('DOMContentLoaded', () => App.init());
