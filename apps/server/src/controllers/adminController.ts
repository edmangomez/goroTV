import { Request, Response } from 'express';
import { db } from '../db/database.js';
import { hashPassword, comparePassword, encryptText, decryptText } from '../utils/crypto.js';
import { signAdminToken } from '../utils/jwt.js';

// --- AUTENTICACIÓN ADMIN ---
export async function adminLogin(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'MISSING_FIELDS', message: 'Usuario y contraseña requeridos' });
    return;
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username) as any;
  if (!admin) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' });
    return;
  }

  const isValid = await comparePassword(password, admin.password_hash);
  if (!isValid) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' });
    return;
  }

  const token = signAdminToken({ adminId: admin.id, username: admin.username });
  res.json({ token, admin: { id: admin.id, username: admin.username } });
}

// --- MÉTRICAS DE DASHBOARD ---
export function getDashboardStats(req: Request, res: Response): void {
  const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  
  const activeUsers = (db.prepare(`
    SELECT COUNT(*) as count FROM users 
    WHERE is_active = 1 AND expires_at > datetime('now')
  `).get() as any).count;

  const expiredUsers = (db.prepare(`
    SELECT COUNT(*) as count FROM users 
    WHERE expires_at <= datetime('now')
  `).get() as any).count;

  const expiringSoonUsers = (db.prepare(`
    SELECT COUNT(*) as count FROM users 
    WHERE is_active = 1 
      AND expires_at > datetime('now') 
      AND expires_at <= datetime('now', '+5 days')
  `).get() as any).count;

  const activeSessions = (db.prepare(`
    SELECT COUNT(*) as count FROM active_sessions 
    WHERE last_ping >= datetime('now', '-75 seconds')
  `).get() as any).count;

  const totalProviders = (db.prepare('SELECT COUNT(*) as count FROM providers WHERE is_active = 1').get() as any).count;

  res.json({
    totalUsers,
    activeUsers,
    expiredUsers,
    expiringSoonUsers,
    activeSessions,
    totalProviders
  });
}

// --- GESTIÓN DE PROVEEDORES ---
export function getProviders(req: Request, res: Response): void {
  const providers = db.prepare(`
    SELECT p.id, p.name, p.host, p.username, p.is_active, p.notes, p.created_at,
           (SELECT COUNT(*) FROM users u WHERE u.provider_id = p.id) as user_count
    FROM providers p
    ORDER BY p.id DESC
  `).all();

  res.json(providers);
}

export function createProvider(req: Request, res: Response): void {
  const { name, host, username, password, notes } = req.body;

  if (!name || !host || !username || !password) {
    res.status(400).json({ error: 'MISSING_FIELDS', message: 'Todos los campos son obligatorios' });
    return;
  }

  let formattedHost = host.trim();
  if (!formattedHost.startsWith('http://') && !formattedHost.startsWith('https://')) {
    formattedHost = `http://${formattedHost}`;
  }
  if (formattedHost.endsWith('/')) {
    formattedHost = formattedHost.slice(0, -1);
  }

  const encryptedPassword = encryptText(password);

  const result = db.prepare(`
    INSERT INTO providers (name, host, username, password, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, formattedHost, username, encryptedPassword, notes || null);

  res.status(201).json({
    id: result.lastInsertRowid,
    name,
    host: formattedHost,
    username,
    notes
  });
}

export function updateProvider(req: Request, res: Response): void {
  const { id } = req.params;
  const { name, host, username, password, notes, is_active } = req.body;

  const existing = db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Proveedor no encontrado' });
    return;
  }

  let formattedHost = host ? host.trim() : existing.host;
  if (formattedHost && !formattedHost.startsWith('http://') && !formattedHost.startsWith('https://')) {
    formattedHost = `http://${formattedHost}`;
  }
  if (formattedHost && formattedHost.endsWith('/')) {
    formattedHost = formattedHost.slice(0, -1);
  }

  const updatedPassword = password ? encryptText(password) : existing.password;

  db.prepare(`
    UPDATE providers 
    SET name = COALESCE(?, name),
        host = COALESCE(?, host),
        username = COALESCE(?, username),
        password = ?,
        notes = ?,
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || null,
    formattedHost || null,
    username || null,
    updatedPassword,
    notes !== undefined ? notes : existing.notes,
    is_active !== undefined ? is_active : existing.is_active,
    id
  );

  res.json({ success: true, message: 'Proveedor actualizado' });
}

export function deleteProvider(req: Request, res: Response): void {
  const { id } = req.params;

  const usersCount = (db.prepare('SELECT COUNT(*) as count FROM users WHERE provider_id = ?').get(id) as any).count;
  if (usersCount > 0) {
    res.status(400).json({
      error: 'PROVIDER_IN_USE',
      message: `No se puede eliminar: tiene ${usersCount} cliente(s) asignado(s). Reasigna los clientes primero.`
    });
    return;
  }

  db.prepare('DELETE FROM providers WHERE id = ?').run(id);
  res.json({ success: true, message: 'Proveedor eliminado correctamente' });
}

export async function testProvider(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const provider = db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as any;

  if (!provider) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Proveedor no encontrado' });
    return;
  }

  const decryptedPassword = decryptText(provider.password);
  const testUrl = `${provider.host}/player_api.php?username=${encodeURIComponent(provider.username)}&password=${encodeURIComponent(decryptedPassword)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(testUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      res.status(502).json({
        success: false,
        message: `El servidor del proveedor respondió con código HTTP ${response.status}`
      });
      return;
    }

    const data = (await response.json()) as any;
    if (data && data.user_info && data.user_info.auth === 1) {
      res.json({
        success: true,
        message: '¡Conexión exitosa con el proveedor Xtream Codes!',
        providerStatus: data.user_info.status,
        providerExpiry: data.user_info.exp_date ? new Date(parseInt(data.user_info.exp_date) * 1000).toISOString() : 'Ilimitado',
        activeCons: data.user_info.active_cons,
        maxCons: data.user_info.max_connections
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Credenciales rechazadas por el servidor Xtream Codes del proveedor'
      });
    }
  } catch (error: any) {
    res.status(504).json({
      success: false,
      message: `No se pudo conectar al servidor: ${error.message || 'Timeout de red'}`
    });
  }
}

// --- GESTIÓN DE CLIENTES ---
export function getUsers(req: Request, res: Response): void {
  const users = db.prepare(`
    SELECT u.id, u.username, u.provider_id, u.max_connections, u.expires_at, 
           u.is_active, u.display_name, u.phone, u.notes, u.created_at,
           p.name as provider_name,
           ROUND(julianday(u.expires_at) - julianday('now')) as days_remaining,
           (SELECT COUNT(*) FROM active_sessions s WHERE s.user_id = u.id AND s.last_ping >= datetime('now', '-75 seconds')) as active_screens
    FROM users u
    JOIN providers p ON u.provider_id = p.id
    ORDER BY u.id DESC
  `).all();

  res.json(users);
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const { username, password, providerId, maxConnections, days, customExpiryDate, displayName, phone, notes } = req.body;

  if (!username || !password || !providerId) {
    res.status(400).json({ error: 'MISSING_FIELDS', message: 'Usuario, contraseña y proveedor son requeridos' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: 'USERNAME_EXISTS', message: 'Este nombre de usuario ya está registrado' });
    return;
  }

  let expiresAtDate: Date;
  if (customExpiryDate) {
    expiresAtDate = new Date(customExpiryDate);
  } else {
    const durationDays = parseInt(days) || 30;
    expiresAtDate = new Date();
    expiresAtDate.setDate(expiresAtDate.getDate() + durationDays);
  }

  const passwordHash = await hashPassword(password);

  const result = db.prepare(`
    INSERT INTO users (username, password_hash, provider_id, max_connections, expires_at, display_name, phone, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    username,
    passwordHash,
    providerId,
    maxConnections ? parseInt(maxConnections) : 1,
    expiresAtDate.toISOString(),
    displayName || null,
    phone || null,
    notes || null
  );

  res.status(201).json({
    id: result.lastInsertRowid,
    username,
    providerId,
    expiresAt: expiresAtDate.toISOString()
  });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { password, providerId, maxConnections, displayName, phone, notes, is_active } = req.body;

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Cliente no encontrado' });
    return;
  }

  const updatedPasswordHash = password ? await hashPassword(password) : existing.password_hash;

  db.prepare(`
    UPDATE users 
    SET password_hash = ?,
        provider_id = COALESCE(?, provider_id),
        max_connections = COALESCE(?, max_connections),
        display_name = ?,
        phone = ?,
        notes = ?,
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    updatedPasswordHash,
    providerId || null,
    maxConnections ? parseInt(maxConnections) : null,
    displayName !== undefined ? displayName : existing.display_name,
    phone !== undefined ? phone : existing.phone,
    notes !== undefined ? notes : existing.notes,
    is_active !== undefined ? is_active : existing.is_active,
    id
  );

  res.json({ success: true, message: 'Cliente actualizado' });
}

export function renewUser(req: Request, res: Response): void {
  const { id } = req.params;
  const { days, customDate } = req.body;

  const user = db.prepare('SELECT expires_at FROM users WHERE id = ?').get(id) as any;
  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Cliente no encontrado' });
    return;
  }

  let newExpiry: Date;
  if (customDate) {
    newExpiry = new Date(customDate);
  } else {
    const additionalDays = parseInt(days) || 30;
    const currentExpiry = new Date(user.expires_at);
    const now = new Date();

    // Si la cuenta ya había expirado, se renueva a partir de HOY.
    // Si la cuenta aún está activa, se suman los días a la fecha que ya tenía.
    const baseDate = currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
    newExpiry = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);
  }

  db.prepare(`
    UPDATE users 
    SET expires_at = ?, is_active = 1, updated_at = datetime('now') 
    WHERE id = ?
  `).run(newExpiry.toISOString(), id);

  res.json({
    success: true,
    message: 'Suscripción renovada exitosamente',
    expiresAt: newExpiry.toISOString()
  });
}

export function toggleUserStatus(req: Request, res: Response): void {
  const { id } = req.params;
  const user = db.prepare('SELECT is_active FROM users WHERE id = ?').get(id) as any;
  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Cliente no encontrado' });
    return;
  }

  const newStatus = user.is_active === 1 ? 0 : 1;
  db.prepare(`UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).run(newStatus, id);

  // Si se suspende, desconectar inmediatamente todas sus sesiones
  if (newStatus === 0) {
    db.prepare('DELETE FROM active_sessions WHERE user_id = ?').run(id);
  }

  res.json({
    success: true,
    isActive: newStatus === 1,
    message: newStatus === 1 ? 'Cuenta activada' : 'Cuenta suspendida'
  });
}

export function deleteUser(req: Request, res: Response): void {
  const { id } = req.params;
  db.prepare('DELETE FROM active_sessions WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true, message: 'Cliente eliminado' });
}

export function getUserSessions(req: Request, res: Response): void {
  const { id } = req.params;
  const sessions = db.prepare(`
    SELECT device_id, device_name, ip_address, last_ping, created_at
    FROM active_sessions
    WHERE user_id = ? AND last_ping >= datetime('now', '-75 seconds')
    ORDER BY last_ping DESC
  `).all(id);

  res.json(sessions);
}

export function terminateUserSessions(req: Request, res: Response): void {
  const { id } = req.params;
  db.prepare('DELETE FROM active_sessions WHERE user_id = ?').run(id);
  res.json({ success: true, message: 'Todas las sesiones del cliente fueron cerradas' });
}
