import { Request, Response, NextFunction } from 'express';
import { verifyToken, ClientTokenPayload } from '../utils/jwt.js';
import { db } from '../db/database.js';

export interface AuthenticatedClientRequest extends Request {
  clientUser?: {
    id: number;
    username: string;
    providerId: number;
    maxConnections: number;
    expiresAt: string;
  };
}

export function requireClient(req: AuthenticatedClientRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token de acceso requerido' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken<ClientTokenPayload>(token);

  if (!payload || payload.role !== 'client') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Sesión no válida' });
    return;
  }

  // Comprobar en base de datos estado activo y fecha de vencimiento
  const stmt = db.prepare(`
    SELECT id, username, provider_id, max_connections, expires_at, is_active,
           ROUND((julianday(expires_at) - julianday('now'))) as days_remaining
    FROM users
    WHERE id = ?
  `);
  
  const user = stmt.get(payload.userId) as any;

  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND', message: 'El usuario ya no existe' });
    return;
  }

  if (user.is_active !== 1) {
    res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Tu cuenta ha sido suspendida. Contacta a soporte.' });
    return;
  }

  const now = new Date();
  const expiresAt = new Date(user.expires_at);

  if (expiresAt.getTime() <= now.getTime()) {
    res.status(403).json({
      error: 'ACCOUNT_EXPIRED',
      message: 'Tu suscripción ha vencido. Contacta a tu proveedor para renovar tu acceso.',
      expiresAt: user.expires_at
    });
    return;
  }

  req.clientUser = {
    id: user.id,
    username: user.username,
    providerId: user.provider_id,
    maxConnections: user.max_connections,
    expiresAt: user.expires_at
  };

  next();
}
