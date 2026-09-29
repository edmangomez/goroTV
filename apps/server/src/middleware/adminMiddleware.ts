import { Request, Response, NextFunction } from 'express';
import { verifyToken, AdminTokenPayload } from '../utils/jwt.js';

export interface AuthenticatedAdminRequest extends Request {
  admin?: AdminTokenPayload;
}

export function requireAdmin(req: AuthenticatedAdminRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token de administrador requerido' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken<AdminTokenPayload>(token);

  if (!payload || payload.role !== 'admin') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Token inválido o privilegios insuficientes' });
    return;
  }

  req.admin = payload;
  next();
}
