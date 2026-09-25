import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';

const router = Router();

function signToken(id: string, username: string, role: string) {
  return jwt.sign({ id, username, role }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  });
}

// Usernames listed in ADMIN_USERNAMES (comma-separated) are promoted to
// admin automatically on signup/login, so the first admin never needs a
// manual DB edit.
function isConfiguredAdmin(username: string): boolean {
  const list = (process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(username.toLowerCase());
}

// SIGN UP
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username e password richiesti' });
      return;
    }

    if (username.length < 3) {
      res.status(400).json({ error: 'Username deve avere almeno 3 caratteri' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password deve avere almeno 6 caratteri' });
      return;
    }

    const existing = await User.findOne({ username });
    if (existing) {
      res.status(409).json({ error: 'Username già in uso' });
      return;
    }

    const user = await User.create({ username, password });
    if (isConfiguredAdmin(user.username)) {
      user.role = 'admin';
      await user.save();
    }
    const token = signToken(String(user._id), user.username, user.role);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        attending: user.attending,
        note: user.note,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// LOGIN
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username e password richiesti' });
      return;
    }

    const user = await User.findOne({ username });
    if (!user) {
      res.status(401).json({ error: 'Credenziali non valide' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: 'Credenziali non valide' });
      return;
    }

    if (isConfiguredAdmin(user.username) && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    const token = signToken(String(user._id), user.username, user.role);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        attending: user.attending,
        note: user.note,
      },
    });
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

export default router;
