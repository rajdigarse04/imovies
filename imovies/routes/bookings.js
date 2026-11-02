const router   = require('express').Router();
const Booking  = require('../models/Booking');
const Showtime = require('../models/Showtime');
const protect  = require('../middleware/auth');

// ─── Create booking (atomic seat reservation) ─────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { showtimeId, seats } = req.body;
    if (!showtimeId || !Array.isArray(seats) || seats.length === 0)
      return res.status(400).json({ message: 'showtimeId and at least one seat are required' });

    // Atomically reserve seats only if none of them are already booked
    const showtime = await Showtime.findOneAndUpdate(
      {
        _id:         showtimeId,
        bookedSeats: { $not: { $elemMatch: { $in: seats } } },
      },
      { $push: { bookedSeats: { $each: seats } } },
      { new: true }
    );

    if (!showtime)
      return res.status(409).json({ message: 'One or more selected seats are already booked. Please choose again.' });

    const booking = await Booking.create({
      userId:     req.user.id,
      showtimeId,
      seats,
      totalPrice: seats.length * showtime.price,
    });

    await booking.populate({
      path:     'showtimeId',
      populate: { path: 'movieId', select: 'title posterUrl' },
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── My bookings ──────────────────────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate({
        path:     'showtimeId',
        populate: { path: 'movieId', select: 'title posterUrl genre duration' },
      })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Cancel booking ────────────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id });
    if (!booking)                       return res.status(404).json({ message: 'Booking not found' });
    if (booking.status === 'cancelled') return res.status(400).json({ message: 'Booking is already cancelled' });

    // Release the seats back to the showtime
    await Showtime.findByIdAndUpdate(booking.showtimeId, {
      $pull: { bookedSeats: { $in: booking.seats } },
    });

    booking.status = 'cancelled';
    await booking.save();
    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
