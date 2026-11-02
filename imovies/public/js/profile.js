/**
 * IMovies – Profile Module: Booking History & Cancellation
 */
const Profile = (() => {

  /* ── Load profile view ──────────────────────────────── */
  async function load() {
    const user = App.state.user;
    if (!user) { App.navigate('home'); return; }

    // Fill user info
    document.getElementById('profile-name').textContent   = user.name;
    document.getElementById('profile-email').textContent  = user.email;
    document.getElementById('profile-avatar').textContent = user.name[0].toUpperCase();

    _showSkeleton(true);
    try {
      const bookings = await App.api('GET', '/bookings/my');
      _renderBookings(bookings);
    } catch (err) {
      App.showToast('Failed to load bookings: ' + err.message, 'error');
    } finally {
      _showSkeleton(false);
    }
  }

  /* ── Render bookings list ───────────────────────────── */
  function _renderBookings(bookings) {
    const list   = document.getElementById('bookings-list');
    const empty  = document.getElementById('bookings-empty');

    list.innerHTML = '';

    if (!bookings.length) {
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    bookings.forEach(b => list.appendChild(_buildCard(b)));
  }

  function _buildCard(booking) {
    const st     = booking.showtimeId || {};
    const movie  = st.movieId        || {};
    const isCancelled = booking.status === 'cancelled';

    const posterHtml = movie.posterUrl
      ? `<img src="${movie.posterUrl}" alt="${movie.title}" onerror="this.parentElement.innerHTML='<div class=\\'booking-poster-placeholder\\'>🎬</div>'">`
      : `<div class="booking-poster-placeholder">🎬</div>`;

    const seatsHtml = (booking.seats || []).sort()
      .map(s => `<span class="seat-chip">${s}</span>`).join('');

    const card = document.createElement('div');
    card.className = `booking-card${isCancelled ? ' cancelled' : ''}`;
    card.id = `booking-${booking._id}`;

    card.innerHTML = `
      <div class="booking-poster">${posterHtml}</div>
      <div class="booking-info">
        <div class="booking-movie">${movie.title || 'Unknown Movie'}</div>
        <div class="booking-meta">
          📅 ${App.formatDate(st.date)} &nbsp;·&nbsp;
          🕐 ${st.time}  &nbsp;·&nbsp;
          🏛️ ${st.hall}
        </div>
        <div class="booking-seats" style="margin-top:0.5rem">${seatsHtml}</div>
      </div>
      <div class="booking-actions">
        <span class="status-badge ${booking.status}">${booking.status === 'confirmed' ? '✓ Confirmed' : '✕ Cancelled'}</span>
        <span class="booking-price">₹ ${booking.totalPrice.toLocaleString('en-IN')}</span>
        ${!isCancelled
          ? `<button class="btn btn-danger" onclick="Profile.cancelBooking('${booking._id}', this)">Cancel</button>`
          : ''}
      </div>
    `;

    return card;
  }

  /* ── Cancel booking ─────────────────────────────────── */
  async function cancelBooking(bookingId, btn) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    btn.disabled    = true;
    btn.textContent = 'Cancelling…';

    try {
      await App.api('DELETE', `/bookings/${bookingId}`);

      // Update card visually
      const card = document.getElementById(`booking-${bookingId}`);
      if (card) {
        card.classList.add('cancelled');
        const badge = card.querySelector('.status-badge');
        if (badge) { badge.className = 'status-badge cancelled'; badge.textContent = '✕ Cancelled'; }
        btn.remove();
      }

      App.showToast('Booking cancelled. Seats have been released.');
    } catch (err) {
      App.showToast(err.message, 'error');
      btn.disabled    = false;
      btn.textContent = 'Cancel';
    }
  }

  function _showSkeleton(show) {
    document.getElementById('bookings-skeleton').classList.toggle('hidden', !show);
    document.getElementById('bookings-list').classList.toggle('hidden',    show);
  }

  return { load, cancelBooking };
})();
