const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    title:     { type: String, required: true },
    genre:     [{ type: String }],
    language:  { type: String, default: 'English' },
    duration:  { type: Number, required: true }, // minutes
    rating:    { type: Number, min: 0, max: 10, default: 0 },
    synopsis:  { type: String },
    posterUrl: { type: String },
    cast:      [{ type: String }],
    director:  { type: String },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Movie', movieSchema);
