// --- TIPOS DE AUTENTICACIÓN Y SESIÓN ---
export type AuthMode = 'service' | 'xtream_direct';

export interface ServiceUser {
  id: number;
  username: string;
  displayName: string;
  expiresAt: string;
  daysRemaining: number;
  maxConnections: number;
}

export interface ProviderCredentials {
  host: string;
  username: string;
  password: string;
}

export interface ClientSession {
  mode: AuthMode;
  serviceUser?: ServiceUser;
  provider: ProviderCredentials;
  token?: string;
  profileName?: string;
}

// --- TIPOS DE CONTENIDO XTREAM CODES ---
export interface Category {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface Channel {
  num?: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface Movie {
  num?: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string | number;
  rating_5based: number;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface MovieDetailInfo {
  info: {
    name: string;
    description?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    duration?: string;
    duration_secs?: number;
    movie_image?: string;
    backdrop_path?: string[];
    youtube_trailer?: string;
    rating?: string;
  };
  movie_data: {
    stream_id: number;
    name: string;
    container_extension: string;
  };
}

export interface Series {
  num?: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string | number;
  rating_5based: number;
  category_id: string;
}

export interface Episode {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info: {
    plot?: string;
    duration?: string;
    duration_secs?: number;
    movie_image?: string;
    rating?: number;
  };
}

export interface Season {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  season_number: number;
  cover: string;
  cover_big: string;
}

export interface SeriesDetailInfo {
  seasons: Season[];
  info: {
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    rating: string;
    backdrop_path: string[];
  };
  episodes: {
    [seasonNum: string]: Episode[];
  };
}

export interface EPGProgramme {
  id: string;
  epg_id: string;
  title: string;
  lang: string;
  start: string;
  end: string;
  description: string;
  channel_id: string;
  start_timestamp: string;
  stop_timestamp: string;
}

// --- TIPOS DE REPRODUCTOR Y PISTAS ---
export interface MediaTrack {
  id: number | string;
  name: string;
  lang?: string;
  type: 'audio' | 'subtitle';
  active: boolean;
  codec?: string;
  channels?: number;
  label?: string;
  role?: string;
  url?: string;
}

export interface SubtitleStyle {
  fontSize: 'small' | 'medium' | 'large';
  color: 'white' | 'yellow' | 'cyan';
  background: 'none' | 'semi' | 'solid';
  lineHeight?: 'compact' | 'normal' | 'relaxed';
  edgeStyle?: 'outline' | 'shadow' | 'none';
  position?: 'bottom' | 'middle';
}
