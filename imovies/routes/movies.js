const router = require('express').Router();
const Movie  = require('../models/Movie');

// ─── List movies (with optional search/genre filter) ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const { genre, search } = req.query;
    const filter = { isActive: true };
    if (genre)  filter.genre = { $in: [genre] };
    if (search) filter.title = { $regex: search, $options: 'i' };
    const movies = await Movie.find(filter).sort({ createdAt: -1 });
    res.json(movies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Single movie ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
