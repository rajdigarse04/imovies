const router   = require('express').Router();
const Showtime = require('../models/Showtime');

// Seat grid constants
const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const COLS = Array.from({ length: 10 }, (_, i) => i + 1);

// ─── List showtimes (filter by movieId and/or date) ───────────────────────────
router.get('/', async (req, res) => {
  try {
    const { movieId, date } = req.query;
    const filter = {};
    if (movieId) filter.movieId = movieId;
    if (date)    filter.date    = date;
    const showtimes = await Showtime.find(filter)
      .populate('movieId', 'title duration')
      .sort({ date: 1, time: 1 });
    res.json(showtimes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Seat availability for a specific showtime ────────────────────────────────
router.get('/:id/seats', async (req, res) => {
  try {
    const showtime = await Showtime.findById(req.params.id).populate('movieId', 'title');
    if (!showtime) return res.status(404).json({ message: 'Showtime not found' });

    const allSeats = ROWS.flatMap(r => COLS.map(c => `${r}${c}`));
    const seats = allSeats.map(seatId => ({
      id:       seatId,
      row:      seatId[0],
      col:      parseInt(seatId.slice(1)),
      isBooked: showtime.bookedSeats.includes(seatId),
    }));

    res.json({ showtime, seats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
