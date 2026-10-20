import { ClientSession } from '../types';

export interface VodProbeAudioTrack {
  id: number;
  codec: string;
  channels?: number;
  language: string;
  title?: string;
  displayName: string;
  needsTranscode: boolean;
}

export interface VodProbeSubtitleTrack {
  id: number;
  language: string;
  title?: string;
  displayName: string;
}

export interface VodProbeResult {
  success: boolean;
  audioTracks: VodProbeAudioTrack[];
  subtitleTracks: VodProbeSubtitleTrack[];
  duration?: number;
  container?: string;
  cached?: boolean;
  fallback?: boolean;
}

export function isCloudflareTunnel(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('gorofamily.com') || (!host.match(/^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))/) && window.location.protocol === 'https:');
}

export function isMkvOrNeedsBridge(_containerExtension?: string, _url?: string): boolean {
  // Regla 1 del proyecto: El reproductor SIEMPRE conecta directamente al proveedor IPTV.
  // El streaming directo al proveedor evita tráfico de video por Cloudflare Tunnel (previniendo suspensión por ToS 2.8).
  return false;
}

export function buildVodBridgeUrl(
  session: ClientSession,
  type: 'movie' | 'series',
  streamId: number,
  extension: string = 'mkv',
  audioTrack: number = 0,
  ss: number = 0
): string {
  const params = new URLSearchParams();
  params.set('type', type);
  params.set('streamId', String(streamId));
  params.set('extension', extension.replace(/^\./, ''));
  params.set('audioTrack', String(audioTrack));
  if (ss > 0) {
    params.set('ss', String(ss));
  }

  if (session.provider) {
    params.set('directHost', session.provider.host);
    params.set('directUser', session.provider.username);
    params.set('directPass', session.provider.password);
  }
  if (session.token) {
    params.set('token', session.token);
  }

  return `/api/client/stream/vod?${params.toString()}`;
}

export async function fetchVodProbe(
  session: ClientSession,
  type: 'movie' | 'series',
  streamId: number,
  extension: string = 'mkv'
): Promise<VodProbeResult | null> {
  try {
    const params = new URLSearchParams();
    params.set('type', type);
    params.set('streamId', String(streamId));
    params.set('extension', extension.replace(/^\./, ''));

    if (session.provider) {
      params.set('directHost', session.provider.host);
      params.set('directUser', session.provider.username);
      params.set('directPass', session.provider.password);
    }
    if (session.token) {
      params.set('token', session.token);
    }

    const headers: Record<string, string> = {};
    if (session.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }

    const res = await fetch(`/api/client/stream/probe?${params.toString()}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[VodStreamHelper] Error al sondear pistas con probe:', err);
    return null;
  }
}
