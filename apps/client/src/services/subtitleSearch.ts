import { MediaTrack } from '../types';
import { convertSrtToVtt } from '../utils/subtitles';
import { formatLanguageName } from '../utils/language';

export interface OnlineSubtitle {
  id: string;
  lang: string;
  langName: string;
  name: string;
  url: string;
  format?: string;
  isSpanish?: boolean;
}

export interface SubtitleSearchResult {
  success: boolean;
  imdbId?: string | null;
  title: string;
  subtitles: OnlineSubtitle[];
  message?: string;
}

const SERVER_BASE_URL = typeof window !== 'undefined'
  ? (window.location.port === '3000' ? 'http://localhost:3001' : '')
  : 'http://localhost:3001';

/**
 * Limpia un título de contenido eliminando sufijos de calidad, códec, idiomas y etiquetas
 */
export function cleanSearchTitle(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .replace(/\b(4k|fhd|hd|hevc|x264|x265|1080p|720p|latino|castellano|sub|dual|audio|temporada|season)\b/gi, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca subtítulos en línea utilizando el backend de goroTV con fallback directo
 */
export async function searchOnlineSubtitles(params: {
  title: string;
  type?: 'movie' | 'series';
  imdbId?: string;
  season?: number;
  episode?: number;
}): Promise<SubtitleSearchResult> {
  const { title, type = 'movie', imdbId, season, episode } = params;
  const cleanTitle = cleanSearchTitle(title) || title;

  // 1. Intentar a través del endpoint proxy de apps/server
  try {
    const q = new URLSearchParams();
    if (cleanTitle) q.set('title', cleanTitle);
    if (type) q.set('type', type);
    if (imdbId) q.set('imdbId', imdbId);
    if (season !== undefined) q.set('season', String(season));
    if (episode !== undefined) q.set('episode', String(episode));

    const serverUrl = `${SERVER_BASE_URL}/api/client/subtitles/search?${q.toString()}`;
    const res = await fetch(serverUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.subtitles)) {
        return data;
      }
    }
  } catch (serverErr) {
    console.warn('[Subtitles] Servidor no respondió, usando fallback directo a Cinemeta / OpenSubtitles:', serverErr);
  }

  // 2. Fallback directo desde el navegador (CORS abierto)
  try {
    let targetImdbId = imdbId;
    let resolvedTitle = cleanTitle;

    if (!targetImdbId) {
      const cinemetaUrl = `https://v3-cinemeta.strem.io/catalog/${type}/top/search=${encodeURIComponent(cleanTitle)}.json`;
      const metaRes = await fetch(cinemetaUrl, { signal: AbortSignal.timeout(5000) });
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        if (metaData && metaData.metas && metaData.metas.length > 0) {
          const first = metaData.metas[0];
          targetImdbId = first.imdb_id || first.id;
          resolvedTitle = first.name || cleanTitle;
        }
      }
    }

    if (!targetImdbId || !targetImdbId.startsWith('tt')) {
      return {
        success: true,
        imdbId: null,
        title: resolvedTitle,
        subtitles: [],
        message: 'No se encontraron subtítulos en línea para este título.',
      };
    }

    const subQueryId = type === 'series' && season !== undefined && episode !== undefined
      ? `${targetImdbId}:${season}:${episode}`
      : targetImdbId;

    const subUrl = `https://opensubtitles-v3.strem.io/subtitles/${type}/${subQueryId}.json`;
    const subRes = await fetch(subUrl, { signal: AbortSignal.timeout(6000) });
    if (!subRes.ok) {
      return { success: true, imdbId: targetImdbId, title: resolvedTitle, subtitles: [] };
    }

    const subData = await subRes.json();
    const rawSubs: any[] = subData?.subtitles || [];

    const formatted: OnlineSubtitle[] = rawSubs.map((s) => {
      const langCode = (s.lang || 'und').toLowerCase();
      const friendlyName = formatLanguageName(langCode, undefined);
      return {
        id: String(s.id),
        lang: langCode,
        langName: friendlyName,
        name: s.subtitleFileName || s.movieReleaseName || `Subtítulo (${friendlyName})`,
        url: s.url,
        format: 'srt',
        isSpanish: langCode === 'spa' || langCode === 'es' || langCode === 'es-419',
      };
    });

    formatted.sort((a, b) => {
      if (a.isSpanish && !b.isSpanish) return -1;
      if (!a.isSpanish && b.isSpanish) return 1;
      if (a.lang === 'eng' && b.lang !== 'eng') return -1;
      if (a.lang !== 'eng' && b.lang === 'eng') return 1;
      return a.name.localeCompare(b.name);
    });

    return {
      success: true,
      imdbId: targetImdbId,
      title: resolvedTitle,
      subtitles: formatted,
    };
  } catch (directErr: any) {
    console.error('[Subtitles] Error en búsqueda directa:', directErr);
    return {
      success: false,
      title: cleanTitle,
      subtitles: [],
      message: directErr?.message || 'Error de conexión al buscar subtítulos.',
    };
  }
}

/**
 * Descarga y convierte un subtítulo online en un Blob WebVTT listo para reproducir
 */
export async function downloadAndActivateSubtitle(sub: OnlineSubtitle): Promise<MediaTrack> {
  let vttText = '';

  // 1. Intentar a través de proxy del backend (convierte a WebVTT en el servidor)
  try {
    const proxyUrl = `${SERVER_BASE_URL}/api/client/subtitles/download?url=${encodeURIComponent(sub.url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      vttText = await res.text();
    }
  } catch (e) {
    console.warn('[Subtitles] Fallback a descarga directa de subtítulo:', e);
  }

  // 2. Si el servidor no respondió, descargar directamente y convertir en cliente
  if (!vttText || !vttText.startsWith('WEBVTT')) {
    const directRes = await fetch(sub.url, { signal: AbortSignal.timeout(8000) });
    const rawContent = await directRes.text();
    vttText = convertSrtToVtt(rawContent);
  }

  // 3. Crear Blob URL en el navegador
  const blob = new Blob([vttText], { type: 'text/vtt;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);

  const cleanLabel = sub.name.replace(/\.(srt|vtt)$/i, '');
  return {
    id: `online_${sub.id}_${Date.now()}`,
    name: `${sub.langName}: ${cleanLabel}`,
    lang: sub.lang,
    type: 'subtitle',
    active: true,
    label: sub.langName,
    url: objectUrl,
  } as MediaTrack;
}
