/**
 * IMovies – Database Seed Script
 * Usage: node scripts/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Movie    = require('../models/Movie');
const Showtime = require('../models/Showtime');
const User     = require('../models/User');
const bcrypt   = require('bcryptjs');

// ─── Sample data ──────────────────────────────────────────────────────────────
const movies = [
  {
    title:    'Inception',
    genre:    ['Sci-Fi', 'Thriller', 'Action'],
    language: 'English',
    duration: 148,
    rating:   8.8,
    director: 'Christopher Nolan',
    synopsis: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.',
    posterUrl: 'https://picsum.photos/seed/inception2010/300/450',
    cast:     ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy', 'Ken Watanabe'],
  },
  {
    title:    'Interstellar',
    genre:    ['Sci-Fi', 'Drama', 'Adventure'],
    language: 'English',
    duration: 169,
    rating:   8.6,
    director: 'Christopher Nolan',
    synopsis: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival as Earth faces environmental collapse.",
    posterUrl: 'https://picsum.photos/seed/interstellar2014/300/450',
    cast:     ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
  },
  {
    title:    'The Dark Knight',
    genre:    ['Action', 'Crime', 'Drama'],
    language: 'English',
    duration: 152,
    rating:   9.0,
    director: 'Christopher Nolan',
    synopsis: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    posterUrl: 'https://picsum.photos/seed/darkknight2008/300/450',
    cast:     ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine', 'Gary Oldman'],
  },
  {
    title:    'Avengers: Endgame',
    genre:    ['Action', 'Adventure', 'Sci-Fi'],
    language: 'English',
    duration: 181,
    rating:   8.4,
    director: 'Anthony & Joe Russo',
    synopsis: "After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos' actions and restore balance to the universe.",
    posterUrl: 'https://picsum.photos/seed/avengersendgame2019/300/450',
    cast:     ['Robert Downey Jr.', 'Chris Evans', 'Mark Ruffalo', 'Chris Hemsworth', 'Scarlett Johansson'],
  },
  {
    title:    'Dune: Part Two',
    genre:    ['Sci-Fi', 'Adventure', 'Drama'],
    language: 'English',
    duration: 166,
    rating:   8.5,
    director: 'Denis Villeneuve',
    synopsis: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future.",
    posterUrl: 'https://picsum.photos/seed/duneparttwo2024/300/450',
    cast:     ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Austin Butler', 'Florence Pugh'],
  },
  {
    title:    'Oppenheimer',
    genre:    ['Biography', 'Drama', 'History'],
    language: 'English',
    duration: 180,
    rating:   8.4,
    director: 'Christopher Nolan',
    synopsis: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.",
    posterUrl: 'https://picsum.photos/seed/oppenheimer2023/300/450',
    cast:     ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.', 'Florence Pugh'],
  },
];

const halls    = ['Hall A', 'Hall B', 'Hall C'];
const times    = ['10:00', '13:30', '17:00', '20:30'];
const prices   = [250, 300, 350]; // INR

// Generate dates for the next 7 days
function getUpcomingDates(count = 7) {
  const dates = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

async function seed() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/imovies';
  await mongoose.connect(MONGO_URI);
  console.log('✅  MongoDB connected');

  // Wipe existing data
  await Promise.all([
    Movie.deleteMany({}),
    Showtime.deleteMany({}),
    User.deleteMany({}),
  ]);
  console.log('🗑️   Cleared existing data');

  // Insert movies
  const insertedMovies = await Movie.insertMany(movies);
  console.log(`🎬  Inserted ${insertedMovies.length} movies`);

  // Insert showtimes (2 showtimes per movie per day for 7 days)
  const dates = getUpcomingDates(7);
  const showtimes = [];

  insertedMovies.forEach((movie, mi) => {
    dates.forEach(date => {
      // 2 random showtimes per movie per day
      const dayTimes = [times[(mi * 2) % times.length], times[(mi * 2 + 2) % times.length]];
      dayTimes.forEach((time, ti) => {
        showtimes.push({
          movieId:    movie._id,
          date,
          time,
          hall:       halls[(mi + ti) % halls.length],
          totalSeats: 80,
          bookedSeats: [],
          price:      prices[mi % prices.length],
        });
      });
    });
  });

  await Showtime.insertMany(showtimes);
  console.log(`🕐  Inserted ${showtimes.length} showtimes`);

  // Demo user
  const passwordHash = await bcrypt.hash('demo1234', 12);
  await User.create({ name: 'Demo User', email: 'demo@imovies.com', passwordHash });
  console.log('👤  Demo user: demo@imovies.com / demo1234');

  console.log('\n🎉  Seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌  Seed error:', err);
  process.exit(1);
});
