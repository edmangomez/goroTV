import {
  Category,
  Channel,
  Movie,
  MovieDetailInfo,
  Series,
  SeriesDetailInfo,
  EPGProgramme,
  ProviderCredentials,
} from '../types';

const ADULT_REGEX = /xxx|adult|adulto|\b18\+|\+18\b|porn|erotic|erotica|playboy|venus|hentai|red\s*light|sensual|sexy/i;

export function isAdultContent(name?: string | null): boolean {
  if (!name) return false;
  return ADULT_REGEX.test(name);
}

export class XtreamApiClient {
  private host: string;
  private user: string;
  private pass: string;

  constructor(creds: ProviderCredentials) {
    let cleanHost = (creds.host || '').trim();
    if (!cleanHost.startsWith('http://') && !cleanHost.startsWith('https://')) {
      cleanHost = `http://${cleanHost}`;
    }
    if (cleanHost.endsWith('/')) {
      cleanHost = cleanHost.slice(0, -1);
    }

    // Si la web corre sobre HTTPS (ej: túnel Cloudflare tv.gorofamily.com) y el host usa HTTP con puertos estándar,
    // convertir automáticamente a HTTPS sin puerto o puerto 443 estándar para evitar bloqueo de Mixed Content.
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      if (cleanHost.startsWith('http://')) {
        if (cleanHost.includes(':2082')) {
          cleanHost = cleanHost.replace('http://', 'https://').replace(':2082', '');
        } else if (cleanHost.includes(':80')) {
          cleanHost = cleanHost.replace('http://', 'https://').replace(':80', '');
        }
      }
    }

    this.host = cleanHost;
    this.user = (creds.username || '').trim();
    this.pass = (creds.password || '').trim();
  }

  private getBaseUrl(): string {
    return `${this.host}/player_api.php?username=${encodeURIComponent(this.user)}&password=${encodeURIComponent(this.pass)}`;
  }

  // Helper centralizado con fallback automático (Directo -> HTTPS Fallback -> Backend Proxy)
  private async fetchData(actionParams: string): Promise<any> {
    const directUrl = actionParams ? `${this.getBaseUrl()}&${actionParams}` : this.getBaseUrl();

    // 1. Intento Directo (con timeout de 4s para no congelar la app si hay bloqueo o lentitud)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(directUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[XtreamApi] Fetch directo no disponible:', err);
    }

    // 2. Si el host original tenía http:// y estamos en https://, probar con https:// sin puerto (timeout 4s)
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && this.host.startsWith('http://')) {
      try {
        const httpsHost = this.host.replace('http://', 'https://').replace(/:\d+$/, '');
        const fallbackUrl = actionParams
          ? `${httpsHost}/player_api.php?username=${encodeURIComponent(this.user)}&password=${encodeURIComponent(this.pass)}&${actionParams}`
          : `${httpsHost}/player_api.php?username=${encodeURIComponent(this.user)}&password=${encodeURIComponent(this.pass)}`;
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 4000);
        const res2 = await fetch(fallbackUrl, { signal: controller2.signal });
        clearTimeout(timeoutId2);
        if (res2.ok) {
          this.host = httpsHost; // Guardar el host HTTPS validado
          return await res2.json();
        }
      } catch (err2) {
        console.warn('[XtreamApi] Fallback HTTPS no disponible:', err2);
      }
    }

    // 3. Fallback a Backend Proxy (resuelve Mixed Content y CORS para cualquier proveedor)
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('gorotv_client_session');
        if (saved) {
          const session = JSON.parse(saved);
          const headers: Record<string, string> = {};
          if (session?.token) {
            headers['Authorization'] = `Bearer ${session.token}`;
          }
          let proxyUrl = actionParams ? `/api/client/xtream?${actionParams}` : '/api/client/xtream';
          // Si es cuenta directa o faltan credenciales en el token, pasar credenciales en query
          if (this.host && this.user && this.pass) {
            const sep = proxyUrl.includes('?') ? '&' : '?';
            proxyUrl += `${sep}directHost=${encodeURIComponent(this.host)}&directUser=${encodeURIComponent(this.user)}&directPass=${encodeURIComponent(this.pass)}`;
          }
          const controller3 = new AbortController();
          const timeoutId3 = setTimeout(() => controller3.abort(), 12000);
          const proxyRes = await fetch(proxyUrl, { headers, signal: controller3.signal });
          clearTimeout(timeoutId3);
          if (proxyRes.ok) {
            return await proxyRes.json();
          }
        }
      } catch (err3) {
        console.warn('[XtreamApi] Fallback Backend Proxy falló:', err3);
      }
    }

    return null;
  }

  async authenticate(): Promise<any> {
    const data = await this.fetchData('');
    if (!data || !data.user_info || data.user_info.auth !== 1) {
      throw new Error('Credenciales de proveedor no válidas o cuenta inactiva');
    }
    return data;
  }

  // --- CATEGORÍAS ---
  async getLiveCategories(): Promise<Category[]> {
    const data = await this.fetchData('action=get_live_categories');
    return Array.isArray(data) ? data.filter((cat) => !isAdultContent(cat.category_name)) : [];
  }

  async getVodCategories(): Promise<Category[]> {
    const data = await this.fetchData('action=get_vod_categories');
    return Array.isArray(data) ? data.filter((cat) => !isAdultContent(cat.category_name)) : [];
  }

  async getSeriesCategories(): Promise<Category[]> {
    const data = await this.fetchData('action=get_series_categories');
    return Array.isArray(data) ? data.filter((cat) => !isAdultContent(cat.category_name)) : [];
  }

  // --- STREAMS Y CONTENIDO ---
  async getLiveStreams(categoryId?: string): Promise<Channel[]> {
    const params = categoryId && categoryId !== 'all'
      ? `action=get_live_streams&category_id=${encodeURIComponent(categoryId)}`
      : 'action=get_live_streams';
    const data = await this.fetchData(params);
    return Array.isArray(data) ? data.filter((item) => !isAdultContent(item.name)) : [];
  }

  async getVodStreams(categoryId?: string): Promise<Movie[]> {
    const params = categoryId && categoryId !== 'all'
      ? `action=get_vod_streams&category_id=${encodeURIComponent(categoryId)}`
      : 'action=get_vod_streams';
    const data = await this.fetchData(params);
    return Array.isArray(data) ? data.filter((item) => !isAdultContent(item.name)) : [];
  }

  async getVodInfo(vodId: number): Promise<MovieDetailInfo> {
    const data = await this.fetchData(`action=get_vod_info&vod_id=${vodId}`);
    return data || {};
  }

  async getSeries(categoryId?: string): Promise<Series[]> {
    const params = categoryId && categoryId !== 'all'
      ? `action=get_series&category_id=${encodeURIComponent(categoryId)}`
      : 'action=get_series';
    const data = await this.fetchData(params);
    return Array.isArray(data) ? data.filter((item) => !isAdultContent(item.name)) : [];
  }

  async getSeriesInfo(seriesId: number): Promise<SeriesDetailInfo> {
    const data = await this.fetchData(`action=get_series_info&series_id=${seriesId}`);
    return data || {};
  }

  async getShortEPG(streamId: number): Promise<EPGProgramme[]> {
    try {
      const data = await this.fetchData(`action=get_short_epg&stream_id=${streamId}&limit=5`);
      return data?.epg_listings || [];
    } catch {
      return [];
    }
  }

  // --- GENERADORES DE URL DIRECTA DE VIDEO ---
  getLiveStreamUrl(streamId: number, format: 'm3u8' | 'ts' = 'm3u8'): string {
    let host = this.host;
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && host.startsWith('http://')) {
      if (host.includes(':2082') || host.includes(':80')) {
        host = host.replace('http://', 'https://').replace(/:2082|:80/, '');
      }
    }
    return `${host}/live/${this.user}/${this.pass}/${streamId}.${format}`;
  }

  getMovieStreamUrl(streamId: number, extension: string = 'mp4'): string {
    let host = this.host;
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && host.startsWith('http://')) {
      if (host.includes(':2082') || host.includes(':80')) {
        host = host.replace('http://', 'https://').replace(/:2082|:80/, '');
      }
    }
    const ext = extension ? extension.replace('.', '') : 'mp4';
    return `${host}/movie/${this.user}/${this.pass}/${streamId}.${ext}`;
  }

  getSeriesStreamUrl(streamId: number, extension: string = 'mp4'): string {
    let host = this.host;
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && host.startsWith('http://')) {
      if (host.includes(':2082') || host.includes(':80')) {
        host = host.replace('http://', 'https://').replace(/:2082|:80/, '');
      }
    }
    const ext = extension ? extension.replace('.', '') : 'mp4';
    return `${host}/series/${this.user}/${this.pass}/${streamId}.${ext}`;
  }
}
