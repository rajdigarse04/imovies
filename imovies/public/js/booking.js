/**
 * IMovies – Booking Module: Seat Map, Reservation, Confirmation
 */
const Booking = (() => {

  let _showtime     = null;
  let _movie        = null;
  let _seatData     = null;
  let _selected     = [];      // array of seat IDs like ['A1', 'B3']
  const MAX_SEATS   = 10;

  /* ── Load seat picker ───────────────────────────────── */
  async function loadSeatPicker(showtime, movie) {
    _showtime  = showtime;
    _movie     = movie;
    _selected  = [];
    App.state.selectedSeats = [];

    _renderStrip();
    _renderSummaryInfo();
    _updateSummary();

    // Show loading state in seat grid
    document.getElementById('seat-grid').innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-secondary)">Loading seat map…</div>';
    document.getElementById('confirm-btn').disabled = true;
    document.getElementById('seat-back-btn').onclick = () => {
      App.navigate('movie-detail', { movie: _movie });
    };

    try {
      const data = await App.api('GET', `/showtimes/${showtime._id}/seats`);
      _seatData  = data.seats;
      _renderSeatGrid(data.seats);
    } catch (err) {
      document.getElementById('seat-grid').innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--danger)">Failed to load seats.</div>';
      App.showToast('Could not load seat map: ' + err.message, 'error');
    }
  }

  /* ── Render movie strip ─────────────────────────────── */
  function _renderStrip() {
    const strip = document.getElementById('booking-strip');
    const poster = _movie?.posterUrl
      ? `<img src="${_movie.posterUrl}" alt="${_movie.title}" onerror="this.src=''">`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.5rem">🎬</div>`;

    strip.innerHTML = `
      <div class="strip-poster">${poster}</div>
      <div>
        <div class="strip-title">${_movie?.title || ''}</div>
        <div class="strip-meta">
          📅 ${App.formatDate(_showtime?.date)} &nbsp;·&nbsp;
          🕐 ${_showtime?.time} &nbsp;·&nbsp;
          🏛️ ${_showtime?.hall}
        </div>
      </div>
    `;
  }

  /* ── Render summary info (static fields) ────────────── */
  function _renderSummaryInfo() {
    document.getElementById('sum-movie').textContent    = _movie?.title || '—';
    document.getElementById('sum-datetime').textContent = `${App.formatDate(_showtime?.date)} · ${_showtime?.time}`;
    document.getElementById('sum-hall').textContent     = _showtime?.hall || '—';
    document.getElementById('sum-price').textContent    = `₹${_showtime?.price}`;
  }

  /* ── Render seat grid ───────────────────────────────── */
  function _renderSeatGrid(seats) {
    const grid = document.getElementById('seat-grid');
    grid.innerHTML = '';

    // Group by row
    const rows = {};
    seats.forEach(s => {
      if (!rows[s.row]) rows[s.row] = [];
      rows[s.row].push(s);
    });

    Object.keys(rows).sort().forEach(rowKey => {
      // Row label
      const label = document.createElement('div');
      label.className   = 'seat-row-label';
      label.textContent = rowKey;
      grid.appendChild(label);

      // Seats in row
      rows[rowKey].sort((a, b) => a.col - b.col).forEach(seat => {
        const el = document.createElement('div');
        el.className    = `seat ${seat.isBooked ? 'booked' : 'available'}`;
        el.dataset.seat = seat.id;
        el.title        = seat.id;
        el.setAttribute('data-seat', seat.id);

        if (!seat.isBooked) {
          el.addEventListener('click', () => _toggleSeat(seat.id, el));
        }

        grid.appendChild(el);
      });
    });
  }

  /* ── Toggle seat selection ──────────────────────────── */
  function _toggleSeat(seatId, el) {
    const idx = _selected.indexOf(seatId);

    if (idx === -1) {
      // Select
      if (_selected.length >= MAX_SEATS) {
        App.showToast(`Maximum ${MAX_SEATS} seats per booking`, 'info');
        return;
      }
      _selected.push(seatId);
      el.classList.remove('available');
      el.classList.add('selected');
    } else {
      // Deselect
      _selected.splice(idx, 1);
      el.classList.remove('selected');
      el.classList.add('available');
    }

    App.state.selectedSeats = _selected;
    _updateSummary();
  }

  /* ── Update booking summary ─────────────────────────── */
  function _updateSummary() {
    const chipsEl    = document.getElementById('seat-chips');
    const totalEl    = document.getElementById('total-amount');
    const confirmBtn = document.getElementById('confirm-btn');

    if (_selected.length === 0) {
      chipsEl.innerHTML = '<span class="no-seats-msg">No seats selected</span>';
    } else {
      const sorted = [..._selected].sort();
      chipsEl.innerHTML = sorted.map(s => `<span class="seat-chip">${s}</span>`).join('');
    }

    const total = _selected.length * (_showtime?.price || 0);
    totalEl.textContent  = `₹ ${total.toLocaleString('en-IN')}`;
    confirmBtn.disabled  = _selected.length === 0;
  }

  /* ── Confirm booking ────────────────────────────────── */
  async function confirmBooking() {
    if (!_selected.length) return;

    const confirmBtn = document.getElementById('confirm-btn');
    confirmBtn.disabled    = true;
    confirmBtn.textContent = 'Confirming…';

    try {
      const booking = await App.api('POST', '/bookings', {
        showtimeId: _showtime._id,
        seats:      _selected,
      });

      _showConfirmModal(booking);
      App.showToast('Booking confirmed! 🎉');

      // Mark seats as booked in the UI
      _selected.forEach(id => {
        const el = document.querySelector(`.seat[data-seat="${id}"]`);
        if (el) { el.classList.remove('selected'); el.classList.add('booked'); el.onclick = null; }
      });
      _selected = [];
      App.state.selectedSeats = [];
      _updateSummary();

    } catch (err) {
      App.showToast(err.message, 'error');
      // Refresh seat map on conflict
      if (err.message.toLowerCase().includes('already booked')) {
        setTimeout(() => loadSeatPicker(_showtime, _movie), 1000);
      }
    } finally {
      confirmBtn.disabled    = false;
      confirmBtn.textContent = 'Confirm Booking';
    }
  }

  /* ── Confirmation modal ─────────────────────────────── */
  function _showConfirmModal(booking) {
    const st      = booking.showtimeId;
    const movie   = st?.movieId;
    const details = document.getElementById('confirm-details');

    details.innerHTML = `
      <div class="confirm-row">
        <span class="cl">Movie</span>
        <span class="cv">${movie?.title || _movie?.title}</span>
      </div>
      <div class="confirm-row">
        <span class="cl">Date &amp; Time</span>
        <span class="cv">${App.formatDate(st?.date)} · ${st?.time}</span>
      </div>
      <div class="confirm-row">
        <span class="cl">Hall</span>
        <span class="cv">${st?.hall}</span>
      </div>
      <div class="confirm-row">
        <span class="cl">Seats</span>
        <span class="cv">${booking.seats.join(', ')}</span>
      </div>
      <div class="confirm-row">
        <span class="cl">Total Paid</span>
        <span class="cv" style="color:var(--accent)">₹ ${booking.totalPrice.toLocaleString('en-IN')}</span>
      </div>
    `;

    document.getElementById('confirm-modal-overlay').classList.remove('hidden');
  }

  return { loadSeatPicker, confirmBooking };
})();
