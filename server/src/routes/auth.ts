import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';

const MAX_FAILED = 5;
const LOCKOUT_MS = 15 * 60 * 1000; 
const AuthSchema = z.object({
username: z.string().regex(/^[a-zA-Z0-9_]{3,30}$/),
password: z.string().min(8).max(72),
});

const router = Router();

function signToken(id: string, username: string, role: string) {
  return jwt.sign({ id, username, role }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  });
}

function isConfiguredAdmin(username: string): boolean {
  const list = (process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(username.toLowerCase());
}

router.post('/signup', async (req: Request, res: Response) => {
  try {

    // if (!username || !password) {
    //   res.status(400).json({ error: 'Username e password richiesti' });
    //   return;
    // }
    // if (username.length < 3) {
    //   res.status(400).json({ error: 'Username deve avere almeno 3 caratteri' });
    //   return;
    // }
    // if (password.length < 6) {
    //   res.status(400).json({ error: 'Password deve avere almeno 6 caratteri' });
    //   return;
    // }
    const parsed = AuthSchema.safeParse(req.body);
    if (!parsed.success) {
    res.status(400).json({ error: 'Input non valido' });
    return;
    }
    const { username, password } = parsed.data;

    // const existing = await User.findOne({ username });
    // if (existing) {
    //   res.status(409).json({ error: 'Username già in uso' });
    //   return;
    // }
    let user;
    try {
    user = await User.create({ username, password });
    } catch (e: any) {
    if (e.code === 11000) {
    res.status(409).json({ error: 'Username già in uso' });
    return;
    }
    throw e;
    }
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

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = AuthSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Credenziali non valide' });
      return;
    }
    const { username, password } = parsed.data;

    const user = await User.findOne({ username });

    const DUMMY_HASH = '$2a$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const candidate = user ? user.password : DUMMY_HASH;
    const isMatch = await import('bcryptjs').then(m => m.compare(password, candidate));

    if (!user || !isMatch) {
      if (user) {
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          res.status(429).json({ error: 'Account bloccato temporaneamente. Riprova tra 15 minuti.' });
          return;
        }
        user.failedLogins = (user.failedLogins ?? 0) + 1;
        if (user.failedLogins >= MAX_FAILED) {
          user.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
          user.failedLogins = 0;
        }
        await user.save();
      }
      res.status(401).json({ error: 'Credenziali non valide' });
      return;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      res.status(429).json({ error: 'Account bloccato temporaneamente. Riprova tra 15 minuti.' });
      return;
    }

    user.failedLogins = 0;
    user.lockedUntil = null;

    if (isConfiguredAdmin(user.username) && user.role !== 'admin') {
      user.role = 'admin';
    }
    await user.save();

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
