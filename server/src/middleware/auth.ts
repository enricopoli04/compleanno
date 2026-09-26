import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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

    // const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as {

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
