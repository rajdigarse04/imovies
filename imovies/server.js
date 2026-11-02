require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes     = require('./routes/auth');
const movieRoutes    = require('./routes/movies');
const showtimeRoutes = require('./routes/showtimes');
const bookingRoutes  = require('./routes/bookings');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth',      authRoutes);
app.use('/api/movies',    movieRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/bookings',  bookingRoutes);

// SPA fallback — serve index.html for any non-API route
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT      = process.env.PORT      || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/imovies';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected');
    app.listen(PORT, () =>
      console.log(`🎬  IMovies running  →  http://localhost:${PORT}`)
    );
  })
  .catch(err => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });
