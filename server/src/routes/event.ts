import { Router, Response } from 'express';
import { auth, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Car } from '../models/Car.js';

const router = Router();

// GET attendance status for current user
router.get('/me', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      res.status(404).json({ error: 'Utente non trovato' });
      return;
    }
    res.json({
      id: user._id,
      username: user.username,
      attending: user.attending,
    });
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// SET attendance
router.put('/attendance', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { attending } = req.body;
    if (!['yes', 'no', null].includes(attending)) {
      res.status(400).json({ error: 'Valore non valido' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { attending },
      { new: true }
    ).select('-password');

    // If user changes to "no" or null, remove them from any car
    if (attending !== 'yes') {
      // Remove as driver
      await Car.deleteMany({ driverUsername: req.username });
      // Remove as passenger
      await Car.updateMany(
        { passengers: req.username },
        { $pull: { passengers: req.username } }
      );
    }

    res.json({
      id: user!._id,
      username: user!.username,
      attending: user!.attending,
    });
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// GET all attendees
router.get('/attendees', auth, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({ attending: { $ne: null } })
      .select('username attending')
      .sort({ username: 1 });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// ── CARS ──

// GET all cars
router.get('/cars', auth, async (_req: AuthRequest, res: Response) => {
  try {
    const cars = await Car.find().sort({ createdAt: 1 });
    res.json(cars);
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// CREATE car (offer ride)
router.post('/cars', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { seats } = req.body;

    // Check user is attending
    const user = await User.findById(req.userId);
    if (!user || user.attending !== 'yes') {
      res.status(400).json({ error: 'Devi partecipare per offrire un passaggio' });
      return;
    }

    // Check not already driver
    const existing = await Car.findOne({ driverUsername: req.username });
    if (existing) {
      res.status(409).json({ error: 'Hai già offerto un passaggio' });
      return;
    }

    // Remove from other cars as passenger
    await Car.updateMany(
      { passengers: req.username },
      { $pull: { passengers: req.username } }
    );

    const car = await Car.create({
      driverUsername: req.username,
      seats: seats || 4,
      passengers: [],
    });

    res.status(201).json(car);
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// DELETE car
router.delete('/cars/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      res.status(404).json({ error: 'Macchina non trovata' });
      return;
    }
    if (car.driverUsername !== req.username) {
      res.status(403).json({ error: 'Non autorizzato' });
      return;
    }
    await car.deleteOne();
    res.json({ message: 'Rimosso' });
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// JOIN car as passenger
router.post('/cars/:id/join', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.attending !== 'yes') {
      res.status(400).json({ error: 'Devi partecipare per salire in macchina' });
      return;
    }

    const car = await Car.findById(req.params.id);
    if (!car) {
      res.status(404).json({ error: 'Macchina non trovata' });
      return;
    }

    if (car.driverUsername === req.username) {
      res.status(400).json({ error: 'Sei il conducente di questa macchina' });
      return;
    }

    if (car.passengers.includes(req.username!)) {
      res.status(400).json({ error: 'Sei già in questa macchina' });
      return;
    }

    if (car.passengers.length >= car.seats) {
      res.status(400).json({ error: 'Macchina piena' });
      return;
    }

    // Remove from other cars first
    await Car.updateMany(
      { passengers: req.username },
      { $pull: { passengers: req.username } }
    );

    // Remove own car if driver
    await Car.deleteMany({ driverUsername: req.username });

    car.passengers.push(req.username!);
    await car.save();

    res.json(car);
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// LEAVE car as passenger
router.post('/cars/:id/leave', auth, async (req: AuthRequest, res: Response) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      res.status(404).json({ error: 'Macchina non trovata' });
      return;
    }

    if (!car.passengers.includes(req.username!)) {
      res.status(400).json({ error: 'Non sei in questa macchina' });
      return;
    }

    car.passengers = car.passengers.filter((p) => p !== req.username);
    await car.save();

    res.json(car);
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// UPDATE car seats
router.put('/cars/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      res.status(404).json({ error: 'Macchina non trovata' });
      return;
    }
    if (car.driverUsername !== req.username) {
      res.status(403).json({ error: 'Non autorizzato' });
      return;
    }

    if (req.body.seats) {
      if (req.body.seats < car.passengers.length) {
        res.status(400).json({ error: 'Non puoi ridurre i posti sotto il numero di passeggeri attuali' });
        return;
      }
      car.seats = req.body.seats;
    }

    await car.save();
    res.json(car);
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

export default router;
