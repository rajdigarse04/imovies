/**
 * IMovies – Admin Routes
 * Protected by a simple admin flag on the user document.
 * For the demo, any user whose email ends with @admin.imovies.com is admin,
 * OR the demo admin account seeded separately.
 */
const router   = require('express').Router();
const Movie    = require('../models/Movie');
const Showtime = require('../models/Showtime');
const Booking  = require('../models/Booking');
const protect  = require('../middleware/auth');

// ─── Admin guard middleware ────────────────────────────────────────────────────
function adminOnly(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// ─── Add movie ─────────────────────────────────────────────────────────────────
router.post('/movies', protect, adminOnly, async (req, res) => {
  try {
    const { title, genre, language, duration, rating, synopsis, posterUrl, cast, director } = req.body;
    if (!title || !duration) return res.status(400).json({ message: 'title and duration are required' });

    const movie = await Movie.create({
      title,
      genre:    Array.isArray(genre) ? genre : (genre || '').split(',').map(g => g.trim()).filter(Boolean),
      language: language || 'English',
      duration: Number(duration),
      rating:   rating != null ? Number(rating) : 0,
      synopsis,
      posterUrl,
      cast:     Array.isArray(cast) ? cast : (cast || '').split(',').map(c => c.trim()).filter(Boolean),
      director,
    });
    res.status(201).json(movie);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Delete movie ──────────────────────────────────────────────────────────────
router.delete('/movies/:id', protect, adminOnly, async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    // Also remove associated showtimes & bookings
    const showtimes = await Showtime.find({ movieId: req.params.id }).select('_id');
    const ids = showtimes.map(s => s._id);
    await Showtime.deleteMany({ movieId: req.params.id });
    if (ids.length) await Booking.deleteMany({ showtimeId: { $in: ids } });
    res.json({ message: 'Movie and related data deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Add showtime ──────────────────────────────────────────────────────────────
router.post('/showtimes', protect, adminOnly, async (req, res) => {
  try {
    const { movieId, date, time, hall, totalSeats, price } = req.body;
    if (!movieId || !date || !time || !hall || !price)
      return res.status(400).json({ message: 'movieId, date, time, hall and price are required' });

    const showtime = await Showtime.create({
      movieId,
      date,
      time,
      hall,
      totalSeats: totalSeats ? Number(totalSeats) : 80,
      bookedSeats: [],
      price: Number(price),
    });
    res.status(201).json(showtime);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Delete showtime ───────────────────────────────────────────────────────────
router.delete('/showtimes/:id', protect, adminOnly, async (req, res) => {
  try {
    const st = await Showtime.findByIdAndDelete(req.params.id);
    if (!st) return res.status(404).json({ message: 'Showtime not found' });
    await Booking.deleteMany({ showtimeId: req.params.id });
    res.json({ message: 'Showtime deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Stats overview ────────────────────────────────────────────────────────────
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [movies, showtimes, bookings] = await Promise.all([
      Movie.countDocuments(),
      Showtime.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
    ]);
    const revenue = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    res.json({
      movies,
      showtimes,
      bookings,
      revenue: revenue[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

