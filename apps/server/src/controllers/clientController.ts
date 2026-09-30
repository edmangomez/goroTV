import { Request, Response } from 'express';
import { db } from '../db/database.js';
import { comparePassword, decryptText } from '../utils/crypto.js';
import { signClientToken } from '../utils/jwt.js';
import { AuthenticatedClientRequest } from '../middleware/clientMiddleware.js';

export async function clientLogin(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'MISSING_FIELDS', message: 'Usuario y contraseña son requeridos' });
    return;
  }

  const stmt = db.prepare(`
    SELECT u.*, 
           p.id as prov_id, p.host as prov_host, p.username as prov_username, 
           p.password as prov_password, p.is_active as prov_active
    FROM users u
    JOIN providers p ON u.provider_id = p.id
    WHERE u.username = ?
  `);

  const user = stmt.get(username) as any;

  if (!user) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Usuario o contraseña incorrectos' });
    return;
  }

  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Usuario o contraseña incorrectos' });
    return;
  }

  if (user.is_active !== 1) {
    res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Tu cuenta ha sido suspendida. Contacta a tu proveedor.' });
    return;
  }

  if (user.prov_active !== 1) {
    res.status(503).json({ error: 'PROVIDER_OFFLINE', message: 'El servicio asignado está en mantenimiento temporal.' });
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

  const diffTime = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const token = signClientToken({
    userId: user.id,
    username: user.username
  });

  const decryptedProviderPassword = decryptText(user.prov_password);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name || user.username,
      expiresAt: user.expires_at,
      daysRemaining,
      maxConnections: user.max_connections || 1
    },
    provider: {
      host: user.prov_host,
      username: user.prov_username,
      password: decryptedProviderPassword
    }
  });
}

export function getClientStatus(req: AuthenticatedClientRequest, res: Response): void {
  const userId = req.clientUser!.id;

  const stmt = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.expires_at, u.max_connections, u.is_active,
           p.host as prov_host, p.username as prov_username, p.password as prov_password
    FROM users u
    JOIN providers p ON u.provider_id = p.id
    WHERE u.id = ?
  `);

  const user = stmt.get(userId) as any;
  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Usuario no encontrado' });
    return;
  }

  const now = new Date();
  const expiresAt = new Date(user.expires_at);
  const diffTime = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.username,
    expiresAt: user.expires_at,
    daysRemaining,
    maxConnections: user.max_connections,
    provider: {
      host: user.prov_host,
      username: user.prov_username,
      password: decryptText(user.prov_password)
    }
  });
}

export function clientHeartbeat(req: AuthenticatedClientRequest, res: Response): void {
  const userId = req.clientUser!.id;
  const maxConnections = req.clientUser!.maxConnections;
  const { deviceId, deviceName } = req.body;

  if (!deviceId) {
    res.status(400).json({ error: 'MISSING_DEVICE_ID', message: 'Identificador de dispositivo requerido' });
    return;
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // 1. Limpiar sesiones obsoletas del usuario (más de 75 segundos sin ping)
  db.prepare(`
    DELETE FROM active_sessions 
    WHERE user_id = ? AND last_ping < datetime('now', '-75 seconds')
  `).run(userId);

  // 2. Contar sesiones activas de OTROS dispositivos
  const otherSessions = db.prepare(`
    SELECT COUNT(*) as count 
    FROM active_sessions 
    WHERE user_id = ? AND device_id != ?
  `).get(userId, deviceId) as any;

  const currentOtherCount = otherSessions.count || 0;

  if (currentOtherCount >= maxConnections) {
    res.status(409).json({
      error: 'SESSION_LIMIT_EXCEEDED',
      message: `Has alcanzado el límite de ${maxConnections} pantalla(s) simultánea(s). Cierra la app en otro dispositivo para continuar.`,
      activeConnections: currentOtherCount,
      maxAllowed: maxConnections
    });
    return;
  }

  // 3. Registrar o actualizar el ping de este dispositivo
  db.prepare(`
    INSERT INTO active_sessions (user_id, device_id, device_name, ip_address, last_ping)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, device_id) DO UPDATE SET
      last_ping = datetime('now'),
      device_name = COALESCE(excluded.device_name, active_sessions.device_name),
      ip_address = excluded.ip_address
  `).run(userId, deviceId, deviceName || 'Dispositivo goroTV', String(ip));

  res.json({
    success: true,
    activeConnections: currentOtherCount + 1,
    maxAllowed: maxConnections
  });
}

export function clientCloseSession(req: AuthenticatedClientRequest, res: Response): void {
  const userId = req.clientUser!.id;
  const { deviceId } = req.body;

  if (deviceId) {
    db.prepare('DELETE FROM active_sessions WHERE user_id = ? AND device_id = ?').run(userId, deviceId);
  } else {
    db.prepare('DELETE FROM active_sessions WHERE user_id = ?').run(userId);
  }

  res.json({ success: true, message: 'Sesión cerrada correctamente' });
}

const LANG_MAP: Record<string, string> = {
  spa: 'Español',
  es: 'Español',
  'es-419': 'Español (Latinoamérica)',
  eng: 'Inglés',
  en: 'Inglés',
  por: 'Portugués',
  pt: 'Portugués',
  fra: 'Francés',
  fr: 'Francés',
  deu: 'Alemán',
  de: 'Alemán',
  ita: 'Italiano',
  it: 'Italiano',
  rus: 'Ruso',
  ru: 'Ruso',
  est: 'Estonio',
  slo: 'Eslovaco',
  dut: 'Holandés',
  nl: 'Holandés',
};

function convertSrtToVtt(content: string): string {
  const normalized = content.replace(/\r\n|\r/g, '\n').trim();
  if (normalized.startsWith('WEBVTT')) return normalized;
  const converted = normalized.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    '$1.$2 --> $3.$4'
  );
  return `WEBVTT\n\n${converted}`;
}

export async function searchSubtitles(req: Request, res: Response): Promise<void> {
  try {
    const rawTitle = (req.query.title as string) || '';
    const type = ((req.query.type as string) || 'movie') === 'series' ? 'series' : 'movie';
    let imdbId = (req.query.imdbId as string) || '';
    const season = req.query.season ? parseInt(req.query.season as string, 10) : undefined;
    const episode = req.query.episode ? parseInt(req.query.episode as string, 10) : undefined;

    if (!rawTitle && !imdbId) {
      res.status(400).json({ error: 'MISSING_QUERY', message: 'Se requiere título o imdbId' });
      return;
    }

    let resolvedTitle = rawTitle;

    // Si no tenemos imdbId, buscar en Cinemeta
    if (!imdbId) {
      const cleanTitle = rawTitle
        .replace(/\[.*?\]|\(.*?\)/g, '')
        .replace(/\b(4k|fhd|hd|hevc|x264|x265|1080p|720p|latino|castellano|sub|dual|audio)\b/gi, '')
        .replace(/[._-]+/g, ' ')
        .trim();

      const searchTitles = [cleanTitle, rawTitle].filter(Boolean);
      for (const query of searchTitles) {
        try {
          const cinemetaUrl = `https://v3-cinemeta.strem.io/catalog/${type}/top/search=${encodeURIComponent(query)}.json`;
          const metaRes = await fetch(cinemetaUrl, { signal: AbortSignal.timeout(5000) });
          if (metaRes.ok) {
            const metaData = (await metaRes.json()) as any;
            if (metaData && metaData.metas && metaData.metas.length > 0) {
              const match = metaData.metas[0];
              imdbId = match.imdb_id || match.id;
              resolvedTitle = match.name || cleanTitle;
              break;
            }
          }
        } catch {}
      }
    }

    if (!imdbId || !imdbId.startsWith('tt')) {
      res.json({
        success: true,
        imdbId: null,
        title: resolvedTitle,
        subtitles: [],
        message: 'No se encontraron subtítulos para este título'
      });
      return;
    }

    // Consultar OpenSubtitles v3 (Stremio addon)
    const subQueryId = type === 'series' && season !== undefined && episode !== undefined
      ? `${imdbId}:${season}:${episode}`
      : imdbId;

    const subUrl = `https://opensubtitles-v3.strem.io/subtitles/${type}/${subQueryId}.json`;
    const subRes = await fetch(subUrl, { signal: AbortSignal.timeout(6000) });
    if (!subRes.ok) {
      res.json({ success: true, imdbId, title: resolvedTitle, subtitles: [] });
      return;
    }

    const subData = (await subRes.json()) as any;
    const rawSubs = (subData && subData.subtitles) || [];

    const formatted = rawSubs.map((s: any) => {
      const langCode = (s.lang || 'und').toLowerCase();
      const langName = LANG_MAP[langCode] || langCode.toUpperCase();
      return {
        id: String(s.id),
        lang: langCode,
        langName,
        name: s.subtitleFileName || s.movieReleaseName || `Subtítulo (${langName})`,
        url: s.url,
        format: 'srt',
        isSpanish: langCode === 'spa' || langCode === 'es' || langCode === 'es-419'
      };
    });

    formatted.sort((a: any, b: any) => {
      if (a.isSpanish && !b.isSpanish) return -1;
      if (!a.isSpanish && b.isSpanish) return 1;
      if (a.lang === 'eng' && b.lang !== 'eng') return -1;
      if (a.lang !== 'eng' && b.lang === 'eng') return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({
      success: true,
      imdbId,
      title: resolvedTitle,
      subtitles: formatted
    });
  } catch (err: any) {
    console.error('[Subtitles] Error en búsqueda de subtítulos:', err);
    res.status(500).json({ error: 'SUBTITLE_SEARCH_FAILED', message: err.message });
  }
}

function isSafeSubtitleUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^::1$/.test(hostname) ||
      /^fe80:/i.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function downloadSubtitle(req: Request, res: Response): Promise<void> {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      res.status(400).send('URL requerida');
      return;
    }

    if (!isSafeSubtitleUrl(targetUrl)) {
      res.status(403).send('URL de subtítulo inválida o denegada por seguridad');
      return;
    }

    const response = await fetch(targetUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      res.status(response.status).send('Error al descargar subtítulo remoto');
      return;
    }

    const rawText = await response.text();
    const vtt = convertSrtToVtt(rawText);

    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(vtt);
  } catch (err: any) {
    console.error('[Subtitles] Error al servir subtítulo:', err);
    res.status(500).send('Error interno al procesar subtítulo');
  }
}

// Proxy transparente para APIs de metadatos de Xtream Codes (evita Mixed Content en HTTPS)
export async function proxyXtreamApi(req: AuthenticatedClientRequest, res: Response): Promise<void> {
  const userId = req.clientUser!.id;
  const stmt = db.prepare(`
    SELECT p.host, p.username, p.password
    FROM users u
    JOIN providers p ON u.provider_id = p.id
    WHERE u.id = ?
  `);
  const provider = stmt.get(userId) as any;
  if (!provider) {
    res.status(404).json({ error: 'PROVIDER_NOT_FOUND', message: 'Proveedor no encontrado' });
    return;
  }

  const decPassword = decryptText(provider.password);

  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      queryParams.set(key, value);
    }
  }

  queryParams.set('username', provider.username);
  queryParams.set('password', decPassword);

  const targetUrl = `${provider.host}/player_api.php?${queryParams.toString()}`;

  try {
    const upstreamRes = await fetch(targetUrl, { signal: AbortSignal.timeout(15000) });
    if (!upstreamRes.ok) {
      res.status(upstreamRes.status).json({ error: 'UPSTREAM_ERROR' });
      return;
    }
    const data = await upstreamRes.json();
    res.json(data);
  } catch (err: any) {
    console.error('[XtreamProxy] Error al consultar proveedor:', err.message);
    res.status(502).json({ error: 'GATEWAY_ERROR', message: err.message });
  }
}

