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
    let cleanHost = creds.host.trim();
    if (!cleanHost.startsWith('http://') && !cleanHost.startsWith('https://')) {
      cleanHost = `http://${cleanHost}`;
    }
    if (cleanHost.endsWith('/')) {
      cleanHost = cleanHost.slice(0, -1);
    }
    this.host = cleanHost;
    this.user = creds.username.trim();
    this.pass = creds.password.trim();
  }

  private getBaseUrl(): string {
    return `${this.host}/player_api.php?username=${encodeURIComponent(this.user)}&password=${encodeURIComponent(this.pass)}`;
  }

  async authenticate(): Promise<any> {
    const url = this.getBaseUrl();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error HTTP ${res.status} al conectar con Xtream Codes`);
    const data = await res.json();
    if (!data || !data.user_info || data.user_info.auth !== 1) {
      throw new Error('Credenciales de proveedor no válidas o cuenta inactiva');
    }
    return data;
  }

  // --- CATEGORÍAS ---
  async getLiveCategories(): Promise<Category[]> {
    const url = `${this.getBaseUrl()}&action=get_live_categories`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter((cat) => !isAdultContent(cat.category_name)) : [];
  }

  async getVodCategories(): Promise<Category[]> {
    const url = `${this.getBaseUrl()}&action=get_vod_categories`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter((cat) => !isAdultContent(cat.category_name)) : [];
  }

  async getSeriesCategories(): Promise<Category[]> {
    const url = `${this.getBaseUrl()}&action=get_series_categories`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter((cat) => !isAdultContent(cat.category_name)) : [];
  }

  // --- STREAMS Y CONTENIDO ---
  async getLiveStreams(categoryId?: string): Promise<Channel[]> {
    let url = `${this.getBaseUrl()}&action=get_live_streams`;
    if (categoryId && categoryId !== 'all') {
      url += `&category_id=${encodeURIComponent(categoryId)}`;
    }
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter((item) => !isAdultContent(item.name)) : [];
  }

  async getVodStreams(categoryId?: string): Promise<Movie[]> {
    let url = `${this.getBaseUrl()}&action=get_vod_streams`;
    if (categoryId && categoryId !== 'all') {
      url += `&category_id=${encodeURIComponent(categoryId)}`;
    }
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter((item) => !isAdultContent(item.name)) : [];
  }

  async getVodInfo(vodId: number): Promise<MovieDetailInfo> {
    const url = `${this.getBaseUrl()}&action=get_vod_info&vod_id=${vodId}`;
    const res = await fetch(url);
    return await res.json();
  }

  async getSeries(categoryId?: string): Promise<Series[]> {
    let url = `${this.getBaseUrl()}&action=get_series`;
    if (categoryId && categoryId !== 'all') {
      url += `&category_id=${encodeURIComponent(categoryId)}`;
    }
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter((item) => !isAdultContent(item.name)) : [];
  }

  async getSeriesInfo(seriesId: number): Promise<SeriesDetailInfo> {
    const url = `${this.getBaseUrl()}&action=get_series_info&series_id=${seriesId}`;
    const res = await fetch(url);
    return await res.json();
  }

  async getShortEPG(streamId: number): Promise<EPGProgramme[]> {
    try {
      const url = `${this.getBaseUrl()}&action=get_short_epg&stream_id=${streamId}&limit=5`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data?.epg_listings || [];
    } catch {
      return [];
    }
  }

  // --- GENERADORES DE URL DIRECTA DE VIDEO ---
  getLiveStreamUrl(streamId: number, format: 'm3u8' | 'ts' = 'm3u8'): string {
    return `${this.host}/live/${this.user}/${this.pass}/${streamId}.${format}`;
  }

  getMovieStreamUrl(streamId: number, extension: string = 'mp4'): string {
    const ext = extension ? extension.replace('.', '') : 'mp4';
    return `${this.host}/movie/${this.user}/${this.pass}/${streamId}.${ext}`;
  }

  getSeriesStreamUrl(streamId: number, extension: string = 'mp4'): string {
    const ext = extension ? extension.replace('.', '') : 'mp4';
    return `${this.host}/series/${this.user}/${this.pass}/${streamId}.${ext}`;
  }
}
