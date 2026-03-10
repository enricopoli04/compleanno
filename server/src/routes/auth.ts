import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const router = Router();

function signToken(id: string, username: string) {
  return jwt.sign({ id, username }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  });
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
    const token = signToken(String(user._id), user.username);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        attending: user.attending,
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

    const token = signToken(String(user._id), user.username);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        attending: user.attending,
      },
    });
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

export default router;
