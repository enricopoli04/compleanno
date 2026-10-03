import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { setAuthCookies, clearAuthCookies } from '../middleware/auth.js';

const router = Router();

const FAKE_HASH = bcrypt.hashSync('password-fittizia', 12);

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

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

function validatePassword(password: string, username: string): string | null {
  if (password.length < 10) return 'Password deve avere almeno 10 caratteri';
  if (Buffer.byteLength(password) > 72) return 'Password troppo lunga';
  if (!/[a-z]/.test(password)) return 'Password deve contenere una lettera minuscola';
  if (!/[A-Z]/.test(password)) return 'Password deve contenere una lettera maiuscola';
  if (!/[0-9]/.test(password)) return 'Password deve contenere un numero';
  if (password.toLowerCase().includes(username.toLowerCase())) {
    return 'Password non può contenere lo username';
  }
  return null;
}

// SIGN UP
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username e password richiesti' });
      return;
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Dati non validi' });
      return;
    }

    if (username.length < 3) {
      res.status(400).json({ error: 'Username deve avere almeno 3 caratteri' });
      return;
    }

    const passwordError = validatePassword(password, username);
    if (passwordError) {
      res.status(400).json({ error: passwordError });
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
    setAuthCookies(res, signToken(String(user._id), user.username, user.role));

    res.status(201).json({
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

    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Dati non validi' });
      return;
    }

    const user = await User.findOne({ username });
    if (!user) {
      await bcrypt.compare(password, FAKE_HASH);
      res.status(401).json({ error: 'Credenziali non valide' });
      return;
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      res.status(429).json({
        error: `Account temporaneamente bloccato, riprova tra ${minutes} minuti`,
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const updated = await User.findByIdAndUpdate(
        user._id,
        { $inc: { failedAttempts: 1 } },
        { new: true }
      );
      if (updated && updated.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        await User.updateOne(
          { _id: user._id },
          { failedAttempts: 0, lockUntil: new Date(Date.now() + LOCK_MINUTES * 60000) }
        );
      }
      res.status(401).json({ error: 'Credenziali non valide' });
      return;
    }

    if (user.failedAttempts > 0 || user.lockUntil) {
      await User.updateOne({ _id: user._id }, { failedAttempts: 0, lockUntil: null });
    }

    if (isConfiguredAdmin(user.username) && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    setAuthCookies(res, signToken(String(user._id), user.username, user.role));

    res.json({
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

router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});

export default router;
