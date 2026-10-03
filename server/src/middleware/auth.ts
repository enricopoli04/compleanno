import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

// Limite di 100 rischieste in una finestra di 15 minuti sulle rotte API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Troppe richieste, riprova più tardi' },
});

// Limite sulle rischieste di login e signup per prevenire attacchi brute-force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Troppi tentativi di accesso, riprova tra 15 minuti' },
});

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
  role?: 'user' | 'admin';
}

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token mancante' });
    return;
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      username: string;
      role: 'user' | 'admin';
    };
    req.userId = decoded.id;
    req.username = decoded.username;
    req.role = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: 'Token non valido' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.role !== 'admin') {
    res.status(403).json({ error: 'Accesso riservato agli amministratori' });
    return;
  }
  next();
}
