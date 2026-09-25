import { Router, Response } from 'express';
import { z } from 'zod';
import { auth, adminOnly, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Car } from '../models/Car.js';
const AttendanceSchema = z.object({ attending: z.enum(['yes', 'no']).nullable() });
const SeatsSchema = z.object({ seats: z.number().int().min(1).max(20) });
const IdSchema = z.string().regex(/^[a-f\d]{24}$/i);

const router = Router();

// All admin routes require a valid token AND the admin role.
router.use(auth, adminOnly);

// GET all users
router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ username: 1 });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// SET a user's attendance
router.put('/users/:id/attendance', async (req: AuthRequest, res: Response) => {
  try {
    if (!IdSchema.safeParse(req.params.id).success) {
      res.status(400).json({ error: 'ID non valido' });
      return;
    }
    const parsed = AttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Valore non valido' });
      return;
    }

    // const { attending } = req.body;
    // if (!['yes', 'no', null].includes(attending)) {
    //   res.status(400).json({ error: 'Valore non valido' });
    //   return;
    // }
    const { attending } = parsed.data;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { attending },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ error: 'Utente non trovato' });
      return;
    }

    if (attending !== 'yes') {
      await Car.deleteMany({ driverUsername: user.username });
      await Car.updateMany(
        { passengers: user.username },
        { $pull: { passengers: user.username } }
      );
    }

    res.json(user);
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// DELETE a user
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.userId) {
      res.status(400).json({ error: 'Non puoi eliminare il tuo stesso account' });
      return;
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'Utente non trovato' });
      return;
    }

    await Car.deleteMany({ driverUsername: user.username });
    await Car.updateMany(
      { passengers: user.username },
      { $pull: { passengers: user.username } }
    );

    res.json({ message: 'Utente eliminato' });
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// GET all cars
router.get('/cars', async (_req: AuthRequest, res: Response) => {
  try {
    const cars = await Car.find().sort({ createdAt: 1 });
    res.json(cars);
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// UPDATE any car's seats
router.put('/cars/:id', async (req: AuthRequest, res: Response) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      res.status(404).json({ error: 'Macchina non trovata' });
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

// DELETE any car
router.delete('/cars/:id', async (req: AuthRequest, res: Response) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      res.status(404).json({ error: 'Macchina non trovata' });
      return;
    }
    await car.deleteOne();
    res.json({ message: 'Rimosso' });
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

export default router;
