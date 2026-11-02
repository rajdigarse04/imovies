/**
 * IMovies – Movies Module: Listing, Search, Filter, Detail View
 */
const Movies = (() => {

  let _allMovies     = [];
  let _activeGenre   = '';
  let _activeSearch  = '';

  /* ── Load & render movie grid ───────────────────────── */
  async function loadMovies() {
    if (_allMovies.length) {
      _renderGrid(_allMovies);
      return;
    }

    _showSkeleton(true);
    try {
      _allMovies = await App.api('GET', '/movies');
      App.state.allMovies = _allMovies;
      _renderGrid(_allMovies);
    } catch (err) {
      App.showToast('Failed to load movies: ' + err.message, 'error');
    } finally {
      _showSkeleton(false);
    }
  }

  /* ── Filter client-side ─────────────────────────────── */
  function filterMovies({ genre, search } = {}) {
    if (genre  !== undefined) _activeGenre  = genre;
    if (search !== undefined) _activeSearch = search;

    let result = _allMovies;

    if (_activeGenre)  result = result.filter(m => m.genre.includes(_activeGenre));
    if (_activeSearch) {
      const q = _activeSearch.toLowerCase();
      result = result.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.cast  || []).some(c => c.toLowerCase().includes(q)) ||
        (m.genre || []).some(g => g.toLowerCase().includes(q))
      );
    }

    _renderGrid(result);
  }

  /* ── Render grid ────────────────────────────────────── */
  function _renderGrid(movies) {
    const grid   = document.getElementById('movies-grid');
    const empty  = document.getElementById('movies-empty');
    const count  = document.getElementById('movie-count');

    grid.innerHTML = '';

    if (!movies.length) {
      empty.classList.remove('hidden');
      count.textContent = '';
      return;
    }

    empty.classList.add('hidden');
    count.textContent = `${movies.length} film${movies.length !== 1 ? 's' : ''}`;

    movies.forEach(movie => {
      const card = _buildCard(movie);
      grid.appendChild(card);
    });
  }

  function _buildCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick   = () => openDetail(movie);

    const posterHtml = movie.posterUrl
      ? `<img src="${movie.posterUrl}" alt="${movie.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'movie-poster-placeholder\\'>🎬</div>'">`
      : `<div class="movie-poster-placeholder">🎬</div>`;

    const genreChips = (movie.genre || []).slice(0, 2)
      .map(g => `<span class="genre-chip">${g}</span>`).join('');

    card.innerHTML = `
      <div class="movie-poster">
        ${posterHtml}
        <div class="movie-rating">⭐ ${movie.rating.toFixed(1)}</div>
      </div>
      <div class="movie-info">
        <div class="movie-title">${movie.title}</div>
        <div class="movie-meta">
          <span>🕐 ${App.formatDuration(movie.duration)}</span>
        </div>
        <div class="movie-meta" style="margin-bottom:0.6rem">${genreChips}</div>
        <button class="movie-book-btn">Book Tickets</button>
      </div>
    `;
    return card;
  }

  /* ── Movie detail view ──────────────────────────────── */
  async function openDetail(movie) {
    App.state.currentMovie = movie;
    App.navigate('movie-detail', { movie });
  }

  async function renderDetail(movie) {
    if (!movie) return;
    App.state.currentMovie = movie;
    const container = document.getElementById('movie-detail-content');

    const posterHtml = movie.posterUrl
      ? `<img src="${movie.posterUrl}" alt="${movie.title}" onerror="this.src=''">`
      : `<div class="movie-poster-placeholder" style="font-size:4rem;height:100%">🎬</div>`;

    const genres = (movie.genre || []).map(g => `<span class="detail-genre-chip">${g}</span>`).join('');
    const cast   = (movie.cast  || []).map(c => `<span class="cast-chip">${c}</span>`).join('');

    container.innerHTML = `
      <div class="detail-poster">${posterHtml}</div>
      <div class="detail-info">
        <div class="detail-genres">${genres}</div>
        <h1 class="detail-title">${movie.title}</h1>
        <div class="detail-meta-row">
          <span>⭐ ${movie.rating.toFixed(1)} / 10</span>
          <span>🕐 ${App.formatDuration(movie.duration)}</span>
          <span>🌐 ${movie.language}</span>
          ${movie.director ? `<span>🎬 ${movie.director}</span>` : ''}
        </div>
        <p class="detail-synopsis">${movie.synopsis || ''}</p>
        ${cast ? `<div class="detail-cast-title">Cast</div><div class="cast-chips">${cast}</div>` : ''}
        <div class="detail-showtimes-title">Select a Date</div>
        <div class="date-picker" id="date-picker"></div>
        <div class="detail-showtimes-title" style="margin-top:1rem">Available Showtimes</div>
        <div class="showtime-slots" id="showtime-slots">
          <span class="no-showtimes">Select a date above</span>
        </div>
      </div>
    `;

    _buildDatePicker(movie);
  }

  function _buildDatePicker(movie) {
    const picker    = document.getElementById('date-picker');
    const dates     = App.getUpcomingDates(7);
    picker.innerHTML = '';

    dates.forEach((dateStr, i) => {
      const d    = new Date(dateStr + 'T00:00:00');
      const btn  = document.createElement('button');
      btn.className  = 'date-btn' + (i === 0 ? ' active' : '');
      btn.dataset.date = dateStr;
      btn.innerHTML = `
        <div class="date-day">${d.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
        <div class="date-num">${d.getDate()}</div>
        <div class="date-month">${d.toLocaleDateString('en-IN', { month: 'short' })}</div>
      `;
      btn.onclick = () => {
        document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _loadShowtimes(movie._id, dateStr);
      };
      picker.appendChild(btn);
    });

    // Auto-load today
    _loadShowtimes(movie._id, dates[0]);
  }

  async function _loadShowtimes(movieId, date) {
    const slotsEl = document.getElementById('showtime-slots');
    slotsEl.innerHTML = '<span class="no-showtimes">Loading…</span>';

    try {
      const showtimes = await App.api('GET', `/showtimes?movieId=${movieId}&date=${date}`);

      if (!showtimes.length) {
        slotsEl.innerHTML = '<span class="no-showtimes">No shows available on this date.</span>';
        return;
      }

      slotsEl.innerHTML = '';
      showtimes.forEach(st => {
        const btn = document.createElement('button');
        btn.className = 'showtime-slot';
        btn.innerHTML = `
          <span style="font-weight:700">${st.time}</span>
          <span class="slot-hall">${st.hall}</span>
          <span class="slot-price">₹${st.price}</span>
        `;
        btn.onclick = () => _handleShowtimeClick(st);
        slotsEl.appendChild(btn);
      });
    } catch (err) {
      slotsEl.innerHTML = '<span class="no-showtimes">Failed to load showtimes.</span>';
    }
  }

  function _handleShowtimeClick(showtime) {
    if (!App.state.token) {
      App.showToast('Please login to book tickets 🔒', 'info');
      Auth.openModal('login');
      return;
    }
    App.state.currentShowtime = showtime;
    App.navigate('seat-picker', { showtime, movie: App.state.currentMovie });
  }

  /* ── Skeleton helpers ───────────────────────────────── */
  function _showSkeleton(show) {
    document.getElementById('movies-skeleton').classList.toggle('hidden', !show);
    document.getElementById('movies-grid').classList.toggle('hidden', show);
  }

  return { loadMovies, filterMovies, renderDetail, openDetail };
})();
