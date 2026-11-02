const mongoose = require('mongoose');

const showtimeSchema = new mongoose.Schema(
  {
    movieId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    date:        { type: String, required: true }, // YYYY-MM-DD
    time:        { type: String, required: true }, // HH:MM
    hall:        { type: String, required: true },
    totalSeats:  { type: Number, default: 80 },
    bookedSeats: [{ type: String }],              // e.g. ['A1', 'B3', 'C5']
    price:       { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Showtime', showtimeSchema);
