import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gorotv_super_secret_jwt_key_change_me_in_production_2026';

export interface ClientTokenPayload {
  userId: number;
  username: string;
  role: 'client';
}

export interface AdminTokenPayload {
  adminId: number;
  username: string;
  role: 'admin';
}

export function signClientToken(payload: Omit<ClientTokenPayload, 'role'>): string {
  return jwt.sign({ ...payload, role: 'client' }, JWT_SECRET, { expiresIn: '30d' });
}

export function signAdminToken(payload: Omit<AdminTokenPayload, 'role'>): string {
  return jwt.sign({ ...payload, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken<T>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch {
    return null;
  }
}
