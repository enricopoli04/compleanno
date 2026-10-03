import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes, timingSafeEqual } from 'crypto';
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

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // stessa durata del JWT (7d)

function cookieOptions(httpOnly: boolean) {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: COOKIE_MAX_AGE,
  };
}

export function setAuthCookies(res: Response, jwtToken: string) {
  res.cookie('token', jwtToken, cookieOptions(true));
  res.cookie('csrf', randomBytes(32).toString('hex'), cookieOptions(false));
}

export function clearAuthCookies(res: Response) {
  const { maxAge, ...opts } = cookieOptions(true);
  res.clearCookie('token', opts);
  res.clearCookie('csrf', { ...opts, httpOnly: false });
}

const CSRF_EXEMPT_PATHS = ['/auth/login', '/auth/signup'];

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const safe = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (safe || CSRF_EXEMPT_PATHS.includes(req.path)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.csrf;
  const headerToken = req.headers['x-csrf-token'];
  if (
    typeof cookieToken !== 'string' ||
    typeof headerToken !== 'string' ||
    cookieToken.length !== headerToken.length ||
    !timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    res.status(403).json({ error: 'Token CSRF non valido' });
    return;
  }
  next();
}

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (typeof token !== 'string') {
    res.status(401).json({ error: 'Non autenticato' });
    return;
  }

  try {
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
