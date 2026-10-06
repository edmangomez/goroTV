import { Request, Response } from 'express';
import { spawn } from 'child_process';
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

// In-memory cache para respuestas de metadatos Xtream (5 minutos TTL)
const xtreamApiCache = new Map<string, { timestamp: number; data: any }>();

// Proxy transparente para APIs de metadatos de Xtream Codes (evita Mixed Content en HTTPS)
export async function proxyXtreamApi(req: AuthenticatedClientRequest, res: Response): Promise<void> {
  let host = '';
  let username = '';
  let password = '';

  const { directHost, directUser, directPass } = req.query as Record<string, string>;
  if (directHost && directUser && directPass) {
    host = directHost;
    username = directUser;
    password = directPass;
  } else if (req.clientUser?.id) {
    const userId = req.clientUser.id;
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
    host = provider.host;
    username = provider.username;
    password = decryptText(provider.password);
  } else {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Autenticación o credenciales requeridas' });
    return;
  }

  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string' && !['directHost', 'directUser', 'directPass'].includes(key)) {
      queryParams.set(key, value);
    }
  }

  queryParams.set('username', username);
  queryParams.set('password', password);

  const cleanHost = host.replace(/\/+$/, '');
  const targetUrl = `${cleanHost}/player_api.php?${queryParams.toString()}`;

  // Verificar caché en memoria
  const cached = xtreamApiCache.get(targetUrl);
  if (cached && Date.now() - cached.timestamp < 300_000) {
    res.json(cached.data);
    return;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
    });
    if (!upstreamRes.ok) {
      res.status(upstreamRes.status).json({ error: 'UPSTREAM_ERROR', status: upstreamRes.status });
      return;
    }
    const data = await upstreamRes.json();
    xtreamApiCache.set(targetUrl, { timestamp: Date.now(), data });
    res.json(data);
  } catch (err: any) {
    console.error('[XtreamProxy] Error al consultar proveedor:', err.message);
    res.status(502).json({ error: 'GATEWAY_ERROR', message: err.message });
  }
}

// --- CONTROLADORES DE PROGRESO DE REPRODUCCIÓN (CONTINUAR VIENDO ESTILO NETFLIX) ---

export function getClientProgress(req: AuthenticatedClientRequest, res: Response): void {
  const userId = req.clientUser!.id;
  const contentType = req.query.type as string | undefined;

  let query = `
    SELECT id, content_type, stream_id, series_id, season_num, episode_num, episode_id,
           title, subtitle, poster_url, progress_seconds, duration_seconds, completed, updated_at
    FROM user_playback_progress
    WHERE user_id = ? AND completed = 0
  `;
  const params: any[] = [userId];

  if (contentType === 'movie' || contentType === 'series') {
    query += ' AND content_type = ?';
    params.push(contentType);
  }

  query += ' ORDER BY updated_at DESC LIMIT 30';

  try {
    const rows = db.prepare(query).all(...params) as any[];
    const items = rows.map((r) => ({
      id: r.id,
      contentType: r.content_type,
      streamId: r.stream_id,
      seriesId: r.series_id,
      seasonNum: r.season_num,
      episodeNum: r.episode_num,
      episodeId: r.episode_id,
      title: r.title,
      subtitle: r.subtitle,
      posterUrl: r.poster_url,
      progressSeconds: Number(r.progress_seconds),
      durationSeconds: Number(r.duration_seconds),
      completed: r.completed === 1,
      updatedAt: r.updated_at,
    }));
    res.json(items);
  } catch (err: any) {
    console.error('[Progress] Error al consultar progreso:', err);
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
}

export function saveClientProgress(req: AuthenticatedClientRequest, res: Response): void {
  const userId = req.clientUser!.id;
  const {
    contentType,
    streamId,
    seriesId,
    seasonNum,
    episodeNum,
    episodeId,
    title,
    subtitle,
    posterUrl,
    progressSeconds,
    durationSeconds,
  } = req.body;

  if (!contentType || !streamId || !title) {
    res.status(400).json({ error: 'MISSING_FIELDS', message: 'Tipo, streamId y título son requeridos' });
    return;
  }

  const prog = Math.max(0, Number(progressSeconds) || 0);
  const dur = Math.max(0, Number(durationSeconds) || 0);

  // Al superar el 90% (créditos) se marca como terminado
  const isCompleted = dur > 0 && prog / dur >= 0.9 ? 1 : 0;

  try {
    db.prepare(`
      INSERT INTO user_playback_progress (
        user_id, content_type, stream_id, series_id, season_num, episode_num, episode_id,
        title, subtitle, poster_url, progress_seconds, duration_seconds, completed, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, content_type, stream_id) DO UPDATE SET
        series_id = COALESCE(excluded.series_id, user_playback_progress.series_id),
        season_num = COALESCE(excluded.season_num, user_playback_progress.season_num),
        episode_num = COALESCE(excluded.episode_num, user_playback_progress.episode_num),
        episode_id = COALESCE(excluded.episode_id, user_playback_progress.episode_id),
        title = excluded.title,
        subtitle = COALESCE(excluded.subtitle, user_playback_progress.subtitle),
        poster_url = COALESCE(excluded.poster_url, user_playback_progress.poster_url),
        progress_seconds = excluded.progress_seconds,
        duration_seconds = excluded.duration_seconds,
        completed = excluded.completed,
        updated_at = datetime('now')
    `).run(
      userId,
      contentType,
      Number(streamId),
      seriesId ? Number(seriesId) : null,
      seasonNum ? Number(seasonNum) : null,
      episodeNum ? Number(episodeNum) : null,
      episodeId ? Number(episodeId) : null,
      title,
      subtitle || null,
      posterUrl || null,
      prog,
      dur,
      isCompleted
    );

    res.json({ success: true, completed: isCompleted === 1 });
  } catch (err: any) {
    console.error('[Progress] Error al guardar progreso:', err);
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
}

export function deleteClientProgress(req: AuthenticatedClientRequest, res: Response): void {
  const userId = req.clientUser!.id;
  const { contentType, streamId } = req.params;

  try {
    db.prepare(`
      DELETE FROM user_playback_progress
      WHERE user_id = ? AND content_type = ? AND stream_id = ?
    `).run(userId, contentType, Number(streamId));

    res.json({ success: true });
  } catch (err: any) {
    console.error('[Progress] Error al eliminar progreso:', err);
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
}

// --- BRIDGE DE AUDIO Y TRANSCODIFICACIÓN AL VUELO PARA VOD (.mkv / AC-3) ---

function resolveVodUpstreamUrl(req: AuthenticatedClientRequest): { url: string; error?: string } {
  const { type, streamId, extension, directHost, directUser, directPass, targetUrl } = req.query as Record<string, string>;

  if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
    return { url: targetUrl };
  }

  const ext = extension || 'mkv';
  const vodType = type === 'series' ? 'series' : 'movie';

  if (directHost && directUser && directPass && streamId) {
    const cleanHost = directHost.replace(/\/+$/, '');
    return { url: `${cleanHost}/${vodType}/${directUser}/${directPass}/${streamId}.${ext}` };
  }

  if (req.clientUser && streamId) {
    const stmt = db.prepare(`
      SELECT p.host, p.username, p.password
      FROM users u
      JOIN providers p ON u.provider_id = p.id
      WHERE u.id = ?
    `);
    const provider = stmt.get(req.clientUser.id) as any;
    if (!provider) {
      return { url: '', error: 'Proveedor no encontrado para este usuario' };
    }
    const decPassword = decryptText(provider.password);
    const cleanHost = provider.host.replace(/\/+$/, '');
    return { url: `${cleanHost}/${vodType}/${provider.username}/${decPassword}/${streamId}.${ext}` };
  }

  return { url: '', error: 'Parámetros insuficientes para resolver stream upstream' };
}

interface ProbeCacheItem {
  timestamp: number;
  data: {
    audioTracks: Array<{
      id: number;
      codec: string;
      channels?: number;
      language: string;
      displayName: string;
      title?: string;
      needsTranscode: boolean;
    }>;
    subtitleTracks: Array<{
      id: number;
      language: string;
      title?: string;
      displayName: string;
    }>;
    duration?: number;
    container?: string;
  };
}

const probeCache = new Map<string, ProbeCacheItem>();

export async function probeVodStream(req: AuthenticatedClientRequest, res: Response): Promise<void> {
  const resolved = resolveVodUpstreamUrl(req);
  if (resolved.error || !resolved.url) {
    res.status(400).json({ error: 'INVALID_STREAM_URL', message: resolved.error || 'URL inválida' });
    return;
  }

  const cached = probeCache.get(resolved.url);
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    res.json({ success: true, ...cached.data, cached: true });
    return;
  }

  try {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      resolved.url,
    ];

    const ffprobeProc = spawn('ffprobe', args);
    let stdout = '';
    let stderr = '';

    ffprobeProc.stdout.on('data', (d) => { stdout += d.toString(); });
    ffprobeProc.stderr.on('data', (d) => { stderr += d.toString(); });

    const timeout = setTimeout(() => {
      try { ffprobeProc.kill('SIGKILL'); } catch {}
    }, 7000);

    ffprobeProc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0 || !stdout) {
        // Fallback genérico si ffprobe falla
        res.json({
          success: true,
          audioTracks: [
            { id: 0, codec: 'unknown', language: 'spa', displayName: 'Pista 1 (Español/Latino)', needsTranscode: true },
            { id: 1, codec: 'unknown', language: 'eng', displayName: 'Pista 2 (Inglés)', needsTranscode: true }
          ],
          subtitleTracks: [],
          fallback: true
        });
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        const streams = parsed.streams || [];
        const audioStreams = streams.filter((s: any) => s.codec_type === 'audio');
        const subtitleStreams = streams.filter((s: any) => s.codec_type === 'subtitle');

        const audioTracks = audioStreams.map((s: any, idx: number) => {
          const lang = (s.tags?.language || s.tags?.LANGUAGE || 'und').toLowerCase();
          const title = s.tags?.title || s.tags?.TITLE || '';
          const codec = (s.codec_name || '').toLowerCase();
          const channels = s.channels || 2;
          const isAc3 = codec === 'ac3' || codec === 'eac3' || codec === 'dts';

          let friendlyLang = LANG_MAP[lang] || lang.toUpperCase();
          if (friendlyLang === 'UND') friendlyLang = 'Original';

          let displayName = title ? `${title} (${friendlyLang})` : friendlyLang;
          if (isAc3) {
            displayName += ` [AC-3 ${channels > 2 ? '5.1' : '2.0'}]`;
          }

          return {
            id: idx,
            codec,
            channels,
            language: lang,
            title,
            displayName,
            needsTranscode: isAc3,
          };
        });

        const subtitleTracks = subtitleStreams.map((s: any, idx: number) => {
          const lang = (s.tags?.language || s.tags?.LANGUAGE || 'und').toLowerCase();
          const title = s.tags?.title || s.tags?.TITLE || '';
          let friendlyLang = LANG_MAP[lang] || lang.toUpperCase();
          return {
            id: idx,
            language: lang,
            title,
            displayName: title ? `${title} (${friendlyLang})` : friendlyLang,
          };
        });

        const duration = parseFloat(parsed.format?.duration || '0');
        const container = parsed.format?.format_name || '';

        const probeData = { audioTracks, subtitleTracks, duration, container };
        probeCache.set(resolved.url, { timestamp: Date.now(), data: probeData });

        res.json({ success: true, ...probeData });
      } catch (parseErr: any) {
        res.status(500).json({ error: 'PARSE_ERROR', message: parseErr.message });
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'FFPROBE_ERROR', message: err.message });
  }
}

export function streamVodAudioBridge(req: AuthenticatedClientRequest, res: Response): void {
  const resolved = resolveVodUpstreamUrl(req);
  if (resolved.error || !resolved.url) {
    res.status(400).json({ error: 'INVALID_STREAM_URL', message: resolved.error || 'URL inválida' });
    return;
  }

  // Soporte para peticiones HEAD del reproductor
  if (req.method === 'HEAD') {
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'none',
      'Access-Control-Allow-Origin': '*',
    });
    res.end();
    return;
  }

  const audioTrackIdx = Math.max(0, parseInt(req.query.audioTrack as string, 10) || 0);
  const seekSec = Math.max(0, parseFloat(req.query.ss as string) || 0);

  const args: string[] = [
    '-nostats',
    '-loglevel', 'warning',
  ];

  if (seekSec > 0) {
    args.push('-ss', seekSec.toFixed(2));
  }

  args.push(
    '-i', resolved.url,
    '-map', '0:v:0',
    '-map', `0:a:${audioTrackIdx}?`,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ac', '2',
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    '-f', 'mp4',
    'pipe:1'
  );

  console.info(`[AudioBridge] Iniciando remux/transcode de audio (ss=${seekSec}s, track=${audioTrackIdx}) para: ${resolved.url}`);

  const ffmpegProc = spawn('ffmpeg', args);

  res.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Cache-Control': 'no-cache, no-store',
    'Access-Control-Allow-Origin': '*',
    'Connection': 'keep-alive',
  });

  ffmpegProc.stdout.pipe(res);

  ffmpegProc.stderr.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('Error') || msg.includes('fatal')) {
      console.warn('[AudioBridge][FFmpeg]', msg.trim());
    }
  });

  const cleanup = () => {
    if (!ffmpegProc.killed) {
      try {
        ffmpegProc.kill('SIGTERM');
        setTimeout(() => {
          if (!ffmpegProc.killed) {
            try { ffmpegProc.kill('SIGKILL'); } catch {}
          }
        }, 1500);
      } catch {}
    }
  };

  req.on('close', () => {
    cleanup();
  });

  ffmpegProc.on('error', (err) => {
    console.error('[AudioBridge] Error al invocar ffmpeg:', err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'FFMPEG_SPAWN_ERROR', message: err.message });
    }
    cleanup();
  });
}


