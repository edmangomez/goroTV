import React, { useEffect, useRef, useState, useCallback } from 'react';
import shaka from 'shaka-player';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import { Loader2, AlertCircle, RefreshCw, Tv, X, ShieldAlert } from 'lucide-react';
import { MediaTrack, SubtitleStyle, Channel } from '../../types';
import { PlayerOSD } from './PlayerOSD';
import { TracksModal } from './TracksModal';
import { formatLanguageName, formatAudioCodec, formatAudioChannels } from '../../utils/language';
import { parseVttToCues, SubtitleCueItem } from '../../utils/subtitles';
import { DualAudioFetchStreamLoader } from '../../services/tsAudioLoader';
import { isFullscreenActive, toggleAppFullscreen, addFullscreenChangeListener } from '../../utils/fullscreen';
import { progressApi } from '../../services/progressApi';
import { probeAudioTracks } from '../../utils/mp4Probe';

// Instalar polyfills de Shaka para compatibilidad en navegadores y Smart TVs (Tizen, webOS, Android TV)
if (typeof window !== 'undefined') {
  try {
    shaka.polyfill.installAll();
  } catch (e) {
    console.warn('[Player] Error al instalar polyfills de Shaka:', e);
  }
}

interface VideoPlayerProps {
  streamUrl: string;
  fallbackUrls?: string[];
  title: string;
  subtitle?: string;
  categoryName?: string;
  isLive?: boolean;
  onBack: () => void;
  onPrevChannel?: () => void;
  onNextChannel?: () => void;
  autoPlay?: boolean;
  channels?: Channel[];
  onSelectChannel?: (channel: Channel) => void;
  initialTime?: number;
  contentType?: 'movie' | 'series';
  streamId?: number;
  seriesId?: number;
  seasonNum?: number;
  episodeNum?: number;
  episodeId?: number;
  posterUrl?: string;
  onProgress?: (progressSeconds: number, durationSeconds: number) => void;
}

interface ShakaInternalAudioTrack {
  id: number | string;
  language: string;
  label?: string;
  codec?: string;
  channels?: number;
  role?: string;
  active: boolean;
  variantTrack?: any;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamUrl,
  fallbackUrls,
  title,
  subtitle,
  categoryName,
  isLive = true,
  onBack,
  onPrevChannel,
  onNextChannel,
  autoPlay = true,
  channels,
  onSelectChannel,
  initialTime,
  contentType,
  streamId,
  seriesId,
  seasonNum,
  episodeNum,
  episodeId,
  posterUrl,
  onProgress,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasSeekedInitialRef = useRef(false);
  const lastProgressReportRef = useRef<number>(0);

  // Instancias de reproductores activos
  const shakaPlayerRef = useRef<shaka.Player | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsPlayerRef = useRef<mpegts.Player | null>(null);
  const currentEngineRef = useRef<'shaka' | 'hls' | 'mpegts' | 'native' | null>(null);
  const cachedShakaAudioTracksRef = useRef<ShakaInternalAudioTrack[]>([]);

  // Estados del reproductor
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | 'cover' | 'contain' | '4:3'>('contain');

  // Estados de OSD, Zap List y controles
  const [osdVisible, setOsdVisible] = useState(true);
  const [zapListOpen, setZapListOpen] = useState(false);
  const osdTimeoutRef = useRef<any>(null);

  // Estados de pistas de audio y subtítulos
  const [audioTracks, setAudioTracks] = useState<MediaTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<MediaTrack[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<number | string>(0);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<number | string | -1>(-1);
  const [activeSubtitleText, setActiveSubtitleText] = useState<string>('');
  const activeCustomCuesRef = useRef<SubtitleCueItem[]>([]);
  const activeNativeTrackRef = useRef<TextTrack | null>(null);
  const [tracksModalOpen, setTracksModalOpen] = useState(false);
  const [tracksInitialTab, setTracksInitialTab] = useState<'audio' | 'subtitles' | 'online'>('audio');

  // Estados de volumen y silenciado (con persistencia en localStorage)
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gorotv_volume');
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
      }
    }
    return 1;
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gorotv_muted') === 'true';
    }
    return false;
  });

  // Estilo visual de subtítulos
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>({
    fontSize: 'medium',
    color: 'white',
    background: 'semi',
    lineHeight: 'normal',
    edgeStyle: 'outline',
    position: 'bottom',
  });

  // Clave serializada para estabilizar las dependencias y evitar re-renders innecesarios
  const fallbackUrlsKey = (fallbackUrls || []).join('|');

  // Lista ordenada y desduplicada de URLs a intentar (streamUrl prioritario y fallbackUrls posteriores)
  const allCandidateUrls = React.useMemo(() => {
    const list = [streamUrl, ...(fallbackUrls || [])].filter(Boolean);
    return Array.from(new Set(list));
  }, [streamUrl, fallbackUrlsKey]);

  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);

  // Reiniciar al inicio cuando cambia la URL o lista de fallbacks
  useEffect(() => {
    setCurrentUrlIndex(0);
  }, [streamUrl, fallbackUrlsKey]);

  const activeStreamUrl = allCandidateUrls[currentUrlIndex] || streamUrl;

  // Mostrar OSD y resetear temporizador de 4.5 segundos
  const showOSD = useCallback(() => {
    setOsdVisible(true);
    if (osdTimeoutRef.current) clearTimeout(osdTimeoutRef.current);
    osdTimeoutRef.current = setTimeout(() => {
      setOsdVisible(false);
    }, 4500);
  }, []);

  // Control interactivo de volumen y silencio
  const updateVolume = useCallback(
    (newVol: number) => {
      const clamped = Math.max(0, Math.min(1, Math.round(newVol * 100) / 100));
      setVolume(clamped);
      if (videoRef.current) {
        videoRef.current.volume = clamped;
        if (clamped > 0 && isMuted) {
          videoRef.current.muted = false;
          setIsMuted(false);
          localStorage.setItem('gorotv_muted', 'false');
        }
      }
      localStorage.setItem('gorotv_volume', String(clamped));
      showOSD();
    },
    [isMuted, showOSD]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.muted = next;
        if (!next && volume === 0) {
          setVolume(0.5);
          videoRef.current.volume = 0.5;
          localStorage.setItem('gorotv_volume', '0.5');
        }
      }
      localStorage.setItem('gorotv_muted', String(next));
      return next;
    });
    showOSD();
  }, [volume, showOSD]);

  // Extraer pistas de audio y subtítulos desde Shaka Player
  const updateShakaTracks = useCallback((player: shaka.Player) => {
    try {
      const variantTracks = player.getVariantTracks();
      const activeVariant = variantTracks.find((v) => v.active);

      // Agrupar variantes por identidad de pista de audio
      const audioMap = new Map<string, {
        id: number | string;
        language: string;
        label?: string;
        codec?: string;
        channels?: number;
        role?: string;
        active: boolean;
        variantTrack?: any;
      }>();

      for (const vt of variantTracks) {
        // Asegurarse de que contenga stream de audio
        const hasAudio = !!(vt.audioCodec || vt.audioId != null || vt.language);
        if (!hasAudio) continue;

        const key = vt.audioId != null
          ? `audio-id-${vt.audioId}`
          : `${vt.language || 'und'}_${vt.audioCodec || ''}_${vt.channelsCount || ''}_${vt.label || ''}`;

        const isThisActive = activeVariant
          ? (vt.audioId != null ? vt.audioId === activeVariant.audioId : vt.language === activeVariant.language && vt.audioCodec === activeVariant.audioCodec)
          : vt.active;

        if (!audioMap.has(key)) {
          audioMap.set(key, {
            id: vt.audioId != null ? vt.audioId : `shaka-aud-${audioMap.size}`,
            language: vt.language || 'und',
            label: vt.label || undefined,
            codec: vt.audioCodec || undefined,
            channels: vt.channelsCount || undefined,
            role: vt.audioRoles && vt.audioRoles.length > 0 ? vt.audioRoles[0] : (vt.roles && vt.roles[0]) || undefined,
            active: isThisActive,
            variantTrack: vt,
          });
        } else if (isThisActive) {
          audioMap.get(key)!.active = true;
        }
      }

      // Si no se encontraron variantTracks con audio, consultar getAudioLanguagesAndRoles
      if (audioMap.size === 0 && typeof player.getAudioLanguagesAndRoles === 'function') {
        const langRoles = player.getAudioLanguagesAndRoles();
        langRoles.forEach((lr, idx) => {
          const key = `lang-${lr.language}-${lr.role || idx}`;
          audioMap.set(key, {
            id: lr.language || `audio-lang-${idx}`,
            language: lr.language || 'und',
            label: lr.role,
            active: idx === 0,
          });
        });
      }

      // Mapear nombres legibles en español
      const detectedTracks: MediaTrack[] = [];
      const internalTracks: ShakaInternalAudioTrack[] = [];

      const baseCount = new Map<string, number>();
      audioMap.forEach((item) => {
        const base = formatLanguageName(item.language, item.label);
        baseCount.set(base, (baseCount.get(base) || 0) + 1);
      });

      audioMap.forEach((item) => {
        const baseName = formatLanguageName(item.language, item.label);
        let finalName = baseName;

        if ((baseCount.get(baseName) || 0) > 1) {
          const codecStr = formatAudioCodec(item.codec);
          const chanStr = formatAudioChannels(item.channels);
          const extra = [codecStr, chanStr].filter(Boolean).join(' - ');
          if (extra) {
            finalName = `${baseName} (${extra})`;
          }
        }

        detectedTracks.push({
          id: item.id,
          name: finalName,
          lang: item.language,
          type: 'audio',
          active: item.active,
          codec: item.codec,
          channels: item.channels,
          label: item.label,
          role: item.role,
        });

        internalTracks.push({
          id: item.id,
          language: item.language,
          label: item.label,
          codec: item.codec,
          channels: item.channels,
          role: item.role,
          active: item.active,
          variantTrack: item.variantTrack,
        });
      });

      cachedShakaAudioTracksRef.current = internalTracks;
      setAudioTracks(detectedTracks);

      const activeAudio = detectedTracks.find((t) => t.active);
      if (activeAudio) {
        setSelectedAudioId(activeAudio.id);
      } else if (detectedTracks.length > 0) {
        setSelectedAudioId(detectedTracks[0].id);
      }
    } catch (err) {
      console.warn('[Player] Error al sincronizar pistas de audio de Shaka:', err);
    }
  }, []);

  // Extraer subtítulos embebidos desde Shaka Player
  const updateShakaSubtitles = useCallback((player: shaka.Player) => {
    try {
      const textTracks = player.getTextTracks();
      const isVisible = player.isTextTrackVisible();

      const subTracks: MediaTrack[] = textTracks.map((t) => {
        const displayName = formatLanguageName(t.language, t.label);
        return {
          id: t.id,
          name: displayName || `Subtítulo ${t.id}`,
          lang: t.language,
          type: 'subtitle',
          active: isVisible && t.active,
          label: t.label || undefined,
        };
      });

      setSubtitleTracks(subTracks);
      const activeSub = subTracks.find((s) => s.active);
      setSelectedSubtitleId(activeSub ? activeSub.id : -1);
    } catch (err) {
      console.warn('[Player] Error al sincronizar subtítulos de Shaka:', err);
    }
  }, []);

  // Limpiar instancias activas de reproductores
  const cleanupActivePlayers = useCallback(async () => {
    if (shakaPlayerRef.current) {
      try {
        await shakaPlayerRef.current.destroy();
      } catch (e) {
        console.warn('[Player] Error al destruir Shaka:', e);
      }
      shakaPlayerRef.current = null;
    }

    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {
        console.warn('[Player] Error al destruir Hls.js:', e);
      }
      hlsRef.current = null;
    }

    if (mpegtsPlayerRef.current) {
      try {
        mpegtsPlayerRef.current.destroy();
      } catch (e) {
        console.warn('[Player] Error al destruir mpegts:', e);
      }
      mpegtsPlayerRef.current = null;
    }

    const vid = videoRef.current;
    if (vid) {
      vid.removeAttribute('src');
      try {
        vid.load();
      } catch {}
    }

    currentEngineRef.current = null;
    cachedShakaAudioTracksRef.current = [];
    activeCustomCuesRef.current = [];
    activeNativeTrackRef.current = null;
    setActiveSubtitleText('');
  }, []);

  // Ciclo principal de inicialización y fallback
  useEffect(() => {
    let isCancelled = false;
    const video = videoRef.current;
    if (!video || !activeStreamUrl) return;

    setLoading(true);
    setError(null);
    setAudioTracks([]);
    setSubtitleTracks([]);
    setSelectedSubtitleId(-1);
    setActiveSubtitleText('');
    activeCustomCuesRef.current = [];
    activeNativeTrackRef.current = null;

    // Intentar saltar a la siguiente URL de fallbackUrls
    const tryNextFallbackUrl = (reason: string): boolean => {
      if (currentUrlIndex < allCandidateUrls.length - 1) {
        console.warn(
          `[Player] ${reason}. Intentando siguiente URL de fallback (${currentUrlIndex + 1}/${allCandidateUrls.length - 1}):`,
          allCandidateUrls[currentUrlIndex + 1]
        );
        setCurrentUrlIndex((prev) => prev + 1);
        return true;
      }
      return false;
    };

    // Temporizador de seguridad para canales en vivo que no responden o se quedan colgados
    let liveStallTimer: any = null;
    if (isLive) {
      liveStallTimer = setTimeout(() => {
        if (isCancelled) return;
        const v = videoRef.current;
        if (v && (v.readyState === 0 || v.paused) && v.currentTime === 0) {
          console.warn('[Player] Watchdog: Canal en vivo sin respuesta tras 7s. Intentando conmutación...');
          if (!tryNextFallbackUrl('Timeout de 7s esperando stream')) {
            if (activeStreamUrl.includes('.m3u8')) {
              const tsDirect = activeStreamUrl.replace('.m3u8', '.ts');
              console.info('[Player] Watchdog: Conmutando a .ts directo:', tsDirect);
              loadMpegts(tsDirect);
            } else {
              setError('Canal no disponible temporalmente en el proveedor (Servidor saturado o sin señal). Puedes cambiar de canal o reintentar.');
              setLoading(false);
            }
          }
        }
      }, 7000);
    }

    // 1. Fallback a reproducción nativa HTML5
    const loadNative = (url: string) => {
      if (isCancelled || !videoRef.current) return;
      console.info('[Player] Inicializando reproducción nativa HTML5:', url);
      currentEngineRef.current = 'native';

      const vid = videoRef.current;
      vid.src = url;
      vid.load();

      const syncNativeTracks = () => {
        if (isCancelled || !videoRef.current) return;
        const v = videoRef.current;

        // Subtítulos nativos
        if (v.textTracks && v.textTracks.length > 0) {
          const subs: MediaTrack[] = Array.from(v.textTracks).map((t, idx) => {
            const friendly = formatLanguageName(t.language, t.label);
            const finalName = friendly && friendly !== 'Original'
              ? friendly
              : (t.label || `Subtítulo ${idx + 1}`);
            return {
              id: idx,
              name: finalName,
              lang: t.language,
              type: 'subtitle' as const,
              active: t.mode === 'showing' || t.mode === 'hidden',
            };
          });
          setSubtitleTracks((prev) => {
            const customSubs = prev.filter(
              (p) => String(p.id).startsWith('online_') || String(p.id).startsWith('custom_')
            );
            return [...subs, ...customSubs];
          });
        }

        // Pistas de audio nativas (HTMLMediaElement.audioTracks en navegadores compatibles)
        const vAny = v as any;
        if (vAny && vAny.audioTracks && vAny.audioTracks.length > 0) {
          const audios: MediaTrack[] = Array.from(vAny.audioTracks as any[]).map((t: any, idx: number) => ({
            id: idx,
            name: formatLanguageName(t.language, t.label) || `Audio ${idx + 1}`,
            lang: t.language,
            type: 'audio',
            active: t.enabled,
          }));
          setAudioTracks(audios);
          const activeAudio = audios.find((a) => a.active);
          if (activeAudio) setSelectedAudioId(activeAudio.id);
        } else if (url.toLowerCase().includes('.mp4')) {
          // Fallback MSE-less para detectar pistas de audio en MP4 en navegadores PC
          probeAudioTracks(url).then(tracks => {
            if (isCancelled || !videoRef.current) return;
            if (tracks.length > 0) {
              const audios: MediaTrack[] = tracks.map((t, idx) => ({
                id: t.id,
                name: t.displayName || `Audio ${idx + 1}`,
                lang: t.language,
                type: 'audio',
                active: idx === 0,
              }));
              setAudioTracks(audios);
              setSelectedAudioId(audios[0].id);
            }
          }).catch(console.warn);
        }
      };

      const onCanPlay = () => {
        if (isCancelled) return;
        if (liveStallTimer) clearTimeout(liveStallTimer);
        setLoading(false);
        if (autoPlay) {
          vid.play().catch(() => setIsPlaying(false));
        }
        syncNativeTracks();
      };

      const onError = () => {
        if (isCancelled) return;
        console.warn('[Player] Error fatal en reproducción nativa para URL:', url);
        if (tryNextFallbackUrl('Error de reproducción nativa HTML5')) {
          return;
        }
        console.error('[Player] Todas las opciones de reproducción y URLs fallaron');
        setError('No se pudo reproducir este stream. Verifica la conexión o el formato del contenido.');
        setLoading(false);
      };

      vid.addEventListener('canplay', onCanPlay, { once: true });
      vid.addEventListener('loadedmetadata', syncNativeTracks);
      vid.addEventListener('error', onError, { once: true });

      if (vid.textTracks) {
        vid.textTracks.addEventListener('addtrack', syncNativeTracks);
        vid.textTracks.addEventListener('change', syncNativeTracks);
      }
    };

    // 2. Fallback a Hls.js
    const loadHls = (url: string) => {
      if (isCancelled || !videoRef.current) return;
      console.info('[Player] Inicializando fallback Hls.js:', url);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (!Hls.isSupported()) {
        loadNative(url);
        return;
      }

      currentEngineRef.current = 'hls';
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 20,
        maxMaxBufferLength: 40,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        manifestLoadingTimeOut: 6000,
        manifestLoadingMaxRetry: 1,
        fragLoadingTimeOut: 6000,
        fragLoadingMaxRetry: 1,
        levelLoadingTimeOut: 6000,
        levelLoadingMaxRetry: 1,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(videoRef.current);

      const syncHlsAudio = () => {
        if (isCancelled || !hlsRef.current) return;
        const h = hlsRef.current;
        if (h.audioTracks && h.audioTracks.length > 0) {
          const tracks: MediaTrack[] = h.audioTracks.map((t, index) => {
            const friendly = formatLanguageName(t.lang, t.name);
            return {
              id: index,
              name: friendly,
              lang: t.lang,
              type: 'audio',
              active: h.audioTrack === index,
            };
          });
          setAudioTracks(tracks);
          if (h.audioTrack >= 0) {
            setSelectedAudioId(h.audioTrack);
          } else if (tracks.length > 0) {
            setSelectedAudioId(0);
          }
        }
      };

      const syncHlsSubtitles = () => {
        if (isCancelled || !hlsRef.current) return;
        const h = hlsRef.current;
        if (h.subtitleTracks && h.subtitleTracks.length > 0) {
          const subTracks: MediaTrack[] = h.subtitleTracks.map((t, index) => ({
            id: index,
            name: formatLanguageName(t.lang, t.name) || `Subtítulo ${index + 1}`,
            lang: t.lang,
            type: 'subtitle',
            active: h.subtitleTrack === index,
          }));
          setSubtitleTracks(subTracks);
          if (h.subtitleTrack >= 0) {
            setSelectedSubtitleId(h.subtitleTrack);
          }
        }
      };

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isCancelled) return;
        if (liveStallTimer) clearTimeout(liveStallTimer);
        setLoading(false);
        if (autoPlay && videoRef.current) {
          videoRef.current.play().catch(() => setIsPlaying(false));
        }
        syncHlsAudio();
        syncHlsSubtitles();
      });

      // Sincronización continua de pistas cuando HLS parsea los segmentos
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, syncHlsAudio);
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, syncHlsAudio);
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, syncHlsSubtitles);
      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, syncHlsSubtitles);

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (isCancelled) return;
        // Si los segmentos HLS devuelven 403 Forbidden (ej. Film Zone u otros canales)
        if (data.details === 'fragLoadError' && data.response?.code === 403) {
          console.warn('[Player] Segmento HLS retornó 403 Forbidden. Conmutando a mpegts.js con TS directo:', activeStreamUrl);
          hls.destroy();
          hlsRef.current = null;
          if (isLive) {
            const tsUrl = activeStreamUrl.replace('.m3u8', '.ts');
            loadMpegts(tsUrl);
            return;
          }
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (
                data.response?.code === 404 ||
                data.response?.code === 403 ||
                data.details === 'manifestLoadError' ||
                data.details === 'manifestParsingError' ||
                data.details === 'fragLoadError'
              ) {
                console.warn('[Player] Manifest/Segmento HLS error (403/404):', data.details);
                hls.destroy();
                hlsRef.current = null;
                // Si es un canal en vivo con .m3u8 que da 403 en segmentos, intentar stream directo .ts con mpegts
                if (isLive && activeStreamUrl.includes('.m3u8')) {
                  const tsUrl = activeStreamUrl.replace('.m3u8', '.ts');
                  console.info('[Player] Conmutando automáticamente a stream directo TS con mpegts:', tsUrl);
                  loadMpegts(tsUrl);
                  return;
                }
                if (!tryNextFallbackUrl('Error 404/403 en Hls.js')) {
                  loadNative(url);
                }
              } else {
                console.warn('[Player] Error de red HLS, reconectando...');
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[Player] Error de medios HLS, recuperando...');
              hls.recoverMediaError();
              break;
            default:
              console.warn('[Player] Error fatal irrecuperable en Hls.js:', data);
              hls.destroy();
              hlsRef.current = null;
              if (isLive && activeStreamUrl.includes('.m3u8')) {
                const tsUrl = activeStreamUrl.replace('.m3u8', '.ts');
                console.info('[Player] Conmutando a stream directo TS con mpegts tras fallo fatal Hls.js:', tsUrl);
                loadMpegts(tsUrl);
                return;
              }
              if (!tryNextFallbackUrl('Error fatal irrecuperable en Hls.js')) {
                loadNative(url);
              }
              break;
          }
        }
      });
    };

    // 3. Fallback a mpegts.js para streams MPEG-TS (en vivo y Dual Audio)
    const loadMpegts = (url: string) => {
      if (isCancelled || !videoRef.current) return;
      console.info('[Player] Inicializando motor mpegts.js para stream TS:', url);

      if (mpegtsPlayerRef.current) {
        try {
          mpegtsPlayerRef.current.destroy();
        } catch {}
        mpegtsPlayerRef.current = null;
      }

      if (!mpegts.isSupported()) {
        console.warn('[Player] mpegts.js no soportado en este entorno, cayendo a nativo');
        loadNative(url);
        return;
      }

      currentEngineRef.current = 'mpegts';
      try {
        const player = mpegts.createPlayer(
          {
            type: 'mse',
            isLive: true,
            url: url,
            cors: true,
          },
          {
            enableWorker: false,
            lazyLoadMaxDuration: 3 * 60,
            seekType: 'range',
            liveBufferLatencyChasing: true,
            liveBufferLatencyMaxLatency: 2.5,
            liveBufferLatencyMinRemain: 0.5,
            customLoader: DualAudioFetchStreamLoader,
            onAudioTracksDiscovered: (discoveredTracks: MediaTrack[]) => {
              if (!isCancelled) {
                console.info('[Player] Pistas Dual Audio descubiertas:', discoveredTracks);
                setAudioTracks(discoveredTracks);
                setSelectedAudioId(0);
              }
            },
          } as any
        );

        mpegtsPlayerRef.current = player;
        player.attachMediaElement(videoRef.current);
        player.load();
        if (autoPlay) {
          player.play()?.catch(() => setIsPlaying(false));
        }

        player.on(mpegts.Events.ERROR, (errorType: string, errorDetail: string, errorInfo: any) => {
          if (isCancelled) return;
          console.warn('[Player] Error en mpegts.js:', errorType, errorDetail, errorInfo);
          if (
            errorType === mpegts.ErrorTypes.NETWORK_ERROR ||
            errorType === mpegts.ErrorTypes.MEDIA_ERROR
          ) {
            if (!tryNextFallbackUrl(`Error en mpegts (${errorDetail})`)) {
              loadNative(url);
            }
          }
        });

        player.on(mpegts.Events.MEDIA_INFO, (info: any) => {
          if (isCancelled) return;
          if (liveStallTimer) clearTimeout(liveStallTimer);
          console.info('[Player] mpegts MEDIA_INFO recibido:', info);
          setLoading(false);
        });
      } catch (e) {
        console.warn('[Player] Excepción al inicializar mpegts.js:', e);
        loadNative(url);
      }
    };

    // 4. Fallback general desde Shaka
    const triggerFallback = async (reason: string) => {
      if (isCancelled) return;
      console.warn(`[Player] Fallback activado (${reason}) para URL:`, activeStreamUrl);

      if (shakaPlayerRef.current) {
        try {
          await shakaPlayerRef.current.destroy();
        } catch {}
        shakaPlayerRef.current = null;
      }

      const isTs = activeStreamUrl.includes('.ts') || activeStreamUrl.endsWith('.ts');
      if (isLive && isTs) {
        loadMpegts(activeStreamUrl);
        return;
      }

      const isHls = activeStreamUrl.includes('.m3u8');
      if (isHls && Hls.isSupported()) {
        loadHls(activeStreamUrl);
      } else if (isLive) {
        const tsUrl = activeStreamUrl.replace('.m3u8', '.ts');
        loadMpegts(tsUrl);
      } else {
        loadNative(activeStreamUrl);
      }
    };

    // 5. Inicializador con Shaka Player prioritario
    const startPlayback = async () => {
      await cleanupActivePlayers();
      if (isCancelled) return;

      const vid = videoRef.current;
      if (!vid) return;

      const isHls = activeStreamUrl.includes('.m3u8') || isLive;

      // Si es un stream MPEG-TS (.ts) en vivo, usar mpegts.js directamente
      const isTs = activeStreamUrl.includes('.ts') || activeStreamUrl.endsWith('.ts');
      if (isTs && isLive) {
        console.info('[Player] Stream directo MPEG-TS detectado para canal en vivo, usando mpegts.js:', activeStreamUrl);
        loadMpegts(activeStreamUrl);
        return;
      }

      // Si es un archivo directo VOD (mp4, mkv, avi) y no es HLS ni en vivo, usar reproducción nativa HTML5 para carga instantánea
      if (!isHls) {
        console.info('[Player] Stream directo VOD detectado, cargando nativo inmediatamente:', activeStreamUrl);
        loadNative(activeStreamUrl);
        return;
      }

      const shakaSupported = typeof window !== 'undefined' && shaka.Player.isBrowserSupported();

      if (shakaSupported) {
        try {
          const player = new shaka.Player();
          shakaPlayerRef.current = player;
          currentEngineRef.current = 'shaka';

          await player.attach(vid);
          if (isCancelled) {
            await player.destroy();
            return;
          }

          // Priorizar códecs ampliamente soportados para evitar audio mudo en navegadores de PC
          player.configure({
            preferredAudioCodecs: ['mp4a', 'aac'],
            streaming: {
              lowLatencyMode: true,
              stallEnabled: true,
              stallThreshold: 4,
              stallSkip: 0.5,
              retryParameters: {
                maxAttempts: 2,
                baseDelay: 500,
                backoffFactor: 1.5,
                fuzzFactor: 0.5,
                timeout: 6000,
              },
            },
          });

          player.addEventListener('error', (event: any) => {
            if (isCancelled) return;
            const err = event.detail;
            console.warn('[Player] Evento de error en Shaka Player:', err);
            if (err && (err.severity === 2 || err.code === 1002 || err.code === 4032)) {
              if (
                (err.code === 1002 || err.code === 4032) &&
                tryNextFallbackUrl(`Error Shaka HTTP/Manifest (${err.code})`)
              ) {
                return;
              }
              triggerFallback(`Error crítico Shaka (código ${err.code})`);
            }
          });

          player.addEventListener('adaptation', () => {
            if (!isCancelled && shakaPlayerRef.current) {
              updateShakaTracks(shakaPlayerRef.current);
            }
          });

          player.addEventListener('trackschanged', () => {
            if (!isCancelled && shakaPlayerRef.current) {
              updateShakaTracks(shakaPlayerRef.current);
              updateShakaSubtitles(shakaPlayerRef.current);
            }
          });

          await player.load(activeStreamUrl, initialTime && initialTime > 0 ? initialTime : null);
          if (isCancelled) return;
          if (liveStallTimer) clearTimeout(liveStallTimer);

          setLoading(false);
          if (autoPlay) {
            vid.play().catch(() => setIsPlaying(false));
          }

          updateShakaTracks(player);
          updateShakaSubtitles(player);

          // Verificar si el stream cargó sin pistas de audio
          const variantTracks = player.getVariantTracks();
          const hasAnyAudio = variantTracks.some(
            (vt) => !!(vt.audioCodec || vt.audioId != null || (vt as any).hasAudio)
          );
          const hasRoles =
            typeof player.getAudioLanguagesAndRoles === 'function' &&
            player.getAudioLanguagesAndRoles().length > 0;

          if (variantTracks.length > 0 && !hasAnyAudio && !hasRoles) {
            if (tryNextFallbackUrl('Stream Shaka cargado sin pistas de audio')) {
              return;
            }
          }

          return;
        } catch (loadErr: any) {
          console.warn('[Player] Fallo al cargar stream con Shaka Player, ejecutando fallback:', loadErr);
          if (isCancelled) return;
          if (
            loadErr &&
            (loadErr.code === 1002 || loadErr.code === 4032) &&
            tryNextFallbackUrl(`Excepción Shaka (${loadErr.code})`)
          ) {
            return;
          }
          await triggerFallback('Excepción durante player.load() en Shaka');
          return;
        }
      } else {
        await triggerFallback('Shaka Player no soportado por el navegador');
      }
    };

    startPlayback();

    return () => {
      isCancelled = true;
      if (liveStallTimer) clearTimeout(liveStallTimer);
      cleanupActivePlayers();
    };
  }, [
    activeStreamUrl,
    currentUrlIndex,
    allCandidateUrls,
    isLive,
    autoPlay,
    cleanupActivePlayers,
    updateShakaTracks,
    updateShakaSubtitles,
  ]);

  // Reiniciar estado de seek al cambiar de stream o initialTime
  useEffect(() => {
    hasSeekedInitialRef.current = false;
  }, [streamUrl, initialTime]);

  // Guardado de progreso centralizado (Netflix style)
  const saveCurrentProgress = useCallback((force = false) => {
    const video = videoRef.current;
    if (!isLive && streamId && contentType && video && video.duration > 0 && video.currentTime > 3) {
      progressApi.saveProgress({
        contentType,
        streamId,
        seriesId,
        seasonNum,
        episodeNum,
        episodeId,
        title,
        subtitle,
        posterUrl,
        progressSeconds: Math.floor(video.currentTime),
        durationSeconds: Math.floor(video.duration),
      }, force);
    }
  }, [isLive, streamId, contentType, seriesId, seasonNum, episodeNum, episodeId, title, subtitle, posterUrl]);

  const handleBack = useCallback(() => {
    saveCurrentProgress(true);
    onBack();
  }, [saveCurrentProgress, onBack]);

  // Sincronizar eventos de reproducción del elemento <video>
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      video.volume = volume;
      video.muted = isMuted;
    };
    const onPause = () => {
      setIsPlaying(false);
      saveCurrentProgress(true);
    };
    const onTimeUpdate = () => {
      const vTime = video.currentTime;
      setCurrentTime(vTime);

      // Sincronización continua de subtítulos en pantalla (Overlay universal)
      if (activeCustomCuesRef.current.length > 0) {
        const match = activeCustomCuesRef.current.find((c) => vTime >= c.start && vTime <= c.end);
        const txt = match ? match.text : '';
        setActiveSubtitleText((prev) => (prev !== txt ? txt : prev));
      } else if (activeNativeTrackRef.current) {
        const tt = activeNativeTrackRef.current;
        if (tt.activeCues && tt.activeCues.length > 0) {
          const txt = Array.from(tt.activeCues)
            .map((c: any) => c.text || '')
            .filter(Boolean)
            .join('\n');
          setActiveSubtitleText((prev) => (prev !== txt ? txt : prev));
        } else {
          setActiveSubtitleText((prev) => (prev !== '' ? '' : prev));
        }
      }

      const now = Date.now();
      if (!isLive && streamId && contentType && video.duration > 0) {
        if (now - lastProgressReportRef.current >= 5000) {
          lastProgressReportRef.current = now;
          saveCurrentProgress(false);
          onProgress?.(vTime, video.duration);
        }
      }
    };
    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
      video.volume = volume;
      video.muted = isMuted;
      if (!hasSeekedInitialRef.current && initialTime && initialTime > 0) {
        try {
          video.currentTime = Math.min(initialTime, video.duration || initialTime);
          hasSeekedInitialRef.current = true;
        } catch (e) {
          console.warn('[VideoPlayer] Error al aplicar initialTime en loadedmetadata:', e);
        }
      }
    };
    const onCanPlay = () => {
      setLoading(false);
      if (!hasSeekedInitialRef.current && initialTime && initialTime > 0) {
        try {
          video.currentTime = Math.min(initialTime, video.duration || initialTime);
          hasSeekedInitialRef.current = true;
        } catch (e) {
          // ignore
        }
      }
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('seeked', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);

    return () => {
      saveCurrentProgress(true);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('seeked', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
    };
  }, [volume, isMuted, saveCurrentProgress, initialTime, isLive, streamId, contentType, onProgress]);


  // Sincronizar reactivamente el volumen cuando cambia o cuando se carga una nueva URL
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = isMuted;
    }
  }, [volume, isMuted, activeStreamUrl]);

  // Manejo de pantalla completa universal (con soporte especial nativo para iPhone / iOS Safari)
  const toggleFullscreen = useCallback(async () => {
    const vid = videoRef.current;
    const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    // En iPhone / iOS Safari, invocar el reproductor nativo directamente en el elemento <video>
    if (vid && typeof (vid as any).webkitEnterFullscreen === 'function' && isIos) {
      try {
        (vid as any).webkitEnterFullscreen();
        setIsFullscreen(true);
        return;
      } catch (err) {
        console.warn('[Player] webkitEnterFullscreen falló, conmutando a fallback:', err);
      }
    }

    const targetEl = containerRef.current || document.documentElement;
    const newState = await toggleAppFullscreen(targetEl);
    setIsFullscreen(newState);
  }, []);

  useEffect(() => {
    setIsFullscreen(isFullscreenActive());
    const cleanup = addFullscreenChangeListener((active) => {
      setIsFullscreen(active);
    });

    // Sincronizar eventos nativos de pantalla completa en iOS Safari
    const vid = videoRef.current;
    const onIosEnter = () => setIsFullscreen(true);
    const onIosExit = () => setIsFullscreen(false);

    if (vid) {
      vid.addEventListener('webkitbeginfullscreen', onIosEnter);
      vid.addEventListener('webkitendfullscreen', onIosExit);
    }

    return () => {
      cleanup();
      if (vid) {
        vid.removeEventListener('webkitbeginfullscreen', onIosEnter);
        vid.removeEventListener('webkitendfullscreen', onIosExit);
      }
    };
  }, []);

  // Acciones de reproducción
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    showOSD();
  };

  const handleSeek = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, seconds));
    showOSD();
  };

  // Cargar y registrar subtítulo externo / online (.srt / .vtt)
  const handleLoadCustomSubtitle = async (track: MediaTrack) => {
    // Si ya trae cues parseadas
    if (track.cues && track.cues.length > 0) {
      activeCustomCuesRef.current = track.cues;
    } else if (track.url) {
      try {
        const res = await fetch(track.url);
        const text = await res.text();
        const parsed = parseVttToCues(text);
        activeCustomCuesRef.current = parsed;
        track.cues = parsed;
      } catch (err) {
        console.warn('[Player] Error al parsear cues de URL de subtítulo:', err);
      }
    }

    setSubtitleTracks((prev) => [
      ...prev.filter((t) => t.id !== track.id).map((t) => ({ ...t, active: false })),
      { ...track, active: true },
    ]);
    setSelectedSubtitleId(track.id);
    activeNativeTrackRef.current = null;

    // Desactivar pistas nativas del elemento de video para evitar conflictos
    const video = videoRef.current;
    if (video && video.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'disabled';
      }
    }

    if (currentEngineRef.current === 'shaka' && shakaPlayerRef.current) {
      shakaPlayerRef.current.setTextTrackVisibility(false);
    }

    // Sincronizar de inmediato el texto si el video está reproduciéndose
    if (video) {
      const now = video.currentTime;
      const match = activeCustomCuesRef.current.find((c) => now >= c.start && now <= c.end);
      setActiveSubtitleText(match ? match.text : '');
    }
  };

  // Cambio dinámico de pista de audio
  const handleSelectAudioTrack = (trackId: number | string) => {
    if (currentEngineRef.current === 'mpegts') {
      const targetIdx = Number(trackId);
      setSelectedAudioId(trackId);
      setAudioTracks((prev) =>
        prev.map((t) => ({
          ...t,
          active: String(t.id) === String(trackId),
        }))
      );
      if (DualAudioFetchStreamLoader.activeProcessor) {
        console.info('[Player] Conmutando pista de audio en mpegts a índice:', targetIdx);
        DualAudioFetchStreamLoader.activeProcessor.setAudioIndex(targetIdx);
      }
    } else if (currentEngineRef.current === 'shaka' && shakaPlayerRef.current) {
      const player = shakaPlayerRef.current;
      const target = cachedShakaAudioTracksRef.current.find((t) => String(t.id) === String(trackId));

      if (target) {
        if (target.language && target.language !== 'und') {
          try {
            player.selectAudioLanguage(
              target.language,
              target.role,
              target.channels,
              undefined,
              target.codec
            );
          } catch (e) {
            console.warn('[Player] Fallo selectAudioLanguage, probando con variante:', e);
            if (target.variantTrack) {
              player.selectVariantTrack(target.variantTrack, true);
            }
          }
        } else if (target.variantTrack) {
          player.selectVariantTrack(target.variantTrack, true);
        }

        setSelectedAudioId(trackId);
        setAudioTracks((prev) =>
          prev.map((t) => ({
            ...t,
            active: String(t.id) === String(trackId),
          }))
        );
      }
    } else if (currentEngineRef.current === 'hls' && hlsRef.current) {
      hlsRef.current.audioTrack = Number(trackId);
      setSelectedAudioId(trackId);
      setAudioTracks((prev) =>
        prev.map((t) => ({
          ...t,
          active: String(t.id) === String(trackId),
        }))
      );
    } else if (videoRef.current) {
      const vidAny = videoRef.current as any;
      if (vidAny && vidAny.audioTracks) {
        for (let i = 0; i < vidAny.audioTracks.length; i++) {
          vidAny.audioTracks[i].enabled = i === Number(trackId);
        }
        setSelectedAudioId(trackId);
        setAudioTracks((prev) =>
          prev.map((t) => ({
            ...t,
            active: String(t.id) === String(trackId),
          }))
        );
      }
    }
  };

  // Cambio dinámico de pista de subtítulos
  const handleSelectSubtitleTrack = async (trackId: number | string | -1) => {
    const isDisable = trackId === -1 || trackId === '-1';

    if (isDisable) {
      setSelectedSubtitleId(-1);
      setActiveSubtitleText('');
      activeCustomCuesRef.current = [];
      activeNativeTrackRef.current = null;

      if (videoRef.current && videoRef.current.textTracks) {
        for (let i = 0; i < videoRef.current.textTracks.length; i++) {
          videoRef.current.textTracks[i].mode = 'disabled';
        }
      }

      if (currentEngineRef.current === 'shaka' && shakaPlayerRef.current) {
        shakaPlayerRef.current.setTextTrackVisibility(false);
      } else if (currentEngineRef.current === 'hls' && hlsRef.current) {
        hlsRef.current.subtitleTrack = -1;
      }

      setSubtitleTracks((prev) => prev.map((t) => ({ ...t, active: false })));
      return;
    }

    // 1. Pista personalizada o descargada online
    const customTrack = subtitleTracks.find((s) => String(s.id) === String(trackId));
    if (customTrack && ((customTrack as any).url || customTrack.cues)) {
      if (customTrack.cues && customTrack.cues.length > 0) {
        activeCustomCuesRef.current = customTrack.cues;
      } else if ((customTrack as any).url) {
        try {
          const res = await fetch((customTrack as any).url);
          const text = await res.text();
          const parsed = parseVttToCues(text);
          activeCustomCuesRef.current = parsed;
          customTrack.cues = parsed;
        } catch (err) {
          console.warn('[Player] Error al cargar cues de track seleccionado:', err);
        }
      }

      activeNativeTrackRef.current = null;
      setSelectedSubtitleId(trackId);
      setSubtitleTracks((prev) =>
        prev.map((t) => ({
          ...t,
          active: String(t.id) === String(trackId),
        }))
      );

      // Desactivar pistas nativas
      if (videoRef.current && videoRef.current.textTracks) {
        for (let i = 0; i < videoRef.current.textTracks.length; i++) {
          videoRef.current.textTracks[i].mode = 'disabled';
        }
      }

      // Sincronizar cue inmediata
      if (videoRef.current) {
        const now = videoRef.current.currentTime;
        const match = activeCustomCuesRef.current.find((c) => now >= c.start && now <= c.end);
        setActiveSubtitleText(match ? match.text : '');
      }
      return;
    }

    // 2. Motor Shaka Player
    if (currentEngineRef.current === 'shaka' && shakaPlayerRef.current) {
      const player = shakaPlayerRef.current;
      const textTracks = player.getTextTracks();
      const target = textTracks.find((t) => String(t.id) === String(trackId));
      if (target) {
        player.selectTextTrack(target);
        player.setTextTrackVisibility(true);
        setSelectedSubtitleId(trackId);
      }
      setSubtitleTracks((prev) =>
        prev.map((t) => ({
          ...t,
          active: !isDisable && String(t.id) === String(trackId),
        }))
      );
      return;
    }

    // 3. Motor Hls.js
    if (currentEngineRef.current === 'hls' && hlsRef.current) {
      hlsRef.current.subtitleTrack = Number(trackId);
      setSelectedSubtitleId(trackId);
      setSubtitleTracks((prev) =>
        prev.map((t) => ({
          ...t,
          active: !isDisable && String(t.id) === String(trackId),
        }))
      );
      return;
    }

    // 4. Pistas de texto nativas en elemento <video> (iPhone WebKit / AVPlayer / Safari)
    if (videoRef.current && videoRef.current.textTracks) {
      const targetIdx = Number(trackId);
      let targetTrack: TextTrack | null = null;

      for (let i = 0; i < videoRef.current.textTracks.length; i++) {
        const tt = videoRef.current.textTracks[i];
        if (i === targetIdx) {
          tt.mode = 'hidden'; // 'hidden' permite leer activeCues y cuechange en JS sin duplicar renderizado
          targetTrack = tt;
        } else {
          tt.mode = 'disabled';
        }
      }

      if (targetTrack) {
        activeNativeTrackRef.current = targetTrack;
        activeCustomCuesRef.current = [];

        const updateCue = () => {
          if (targetTrack?.activeCues && targetTrack.activeCues.length > 0) {
            const txt = Array.from(targetTrack.activeCues)
              .map((c: any) => c.text || '')
              .filter(Boolean)
              .join('\n');
            setActiveSubtitleText(txt);
          } else {
            setActiveSubtitleText('');
          }
        };

        targetTrack.oncuechange = updateCue;
        updateCue();
      }

      setSelectedSubtitleId(trackId);
      setSubtitleTracks((prev) =>
        prev.map((t) => ({
          ...t,
          active: !isDisable && String(t.id) === String(trackId),
        }))
      );
    }
  };

  // Rotar relación de aspecto
  const cycleAspectRatio = () => {
    const modes: ('contain' | 'cover' | '16:9' | '4:3')[] = ['contain', 'cover', '16:9', '4:3'];
    const nextIdx = (modes.indexOf(aspectRatio) + 1) % modes.length;
    setAspectRatio(modes[nextIdx]);
    showOSD();
  };

  // Abrir modal de pistas en una pestaña concreta ('audio', 'subtitles' u 'online')
  const handleOpenTracksModal = (tab: 'audio' | 'subtitles' | 'online' = 'audio') => {
    setTracksInitialTab(tab);
    setTracksModalOpen(true);
  };

  // Control remoto (D-Pad y teclado estilo YouTube)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Si el usuario está escribiendo en un input (ej. buscador de subtítulos), no interceptar letras
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isTyping && e.key !== 'Escape') return;

      showOSD();

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          if (!isLive) {
            e.preventDefault();
            handleSeek(currentTime - 10);
          }
          break;
        case 'ArrowRight':
          if (!isLive) {
            e.preventDefault();
            handleSeek(currentTime + 10);
          }
          break;
        case 'ArrowUp':
        case 'PageUp':
          if (isLive && onNextChannel) {
            e.preventDefault();
            onNextChannel();
          } else if (!isLive) {
            e.preventDefault();
            updateVolume(volume + 0.05);
          }
          break;
        case 'ArrowDown':
        case 'PageDown':
          if (isLive && onPrevChannel) {
            e.preventDefault();
            onPrevChannel();
          } else if (!isLive) {
            e.preventDefault();
            updateVolume(volume - 0.05);
          }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case '+':
        case '=':
          e.preventDefault();
          updateVolume(volume + 0.05);
          break;
        case '-':
        case '_':
          e.preventDefault();
          updateVolume(volume - 0.05);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          toggleFullscreen();
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          handleOpenTracksModal('subtitles');
          break;
        case 's':
        case 'S':
          e.preventDefault();
          handleOpenTracksModal('online');
          break;
        case 'a':
        case 'A':
          e.preventDefault();
          handleOpenTracksModal('audio');
          break;
        case 'z':
        case 'Z':
          if (channels && channels.length > 0) {
            e.preventDefault();
            setZapListOpen((prev) => !prev);
          }
          break;
        case 'Escape':
        case 'Backspace':
          if (zapListOpen) {
            e.preventDefault();
            setZapListOpen(false);
          } else if (tracksModalOpen) {
            e.preventDefault();
            setTracksModalOpen(false);
          } else {
            handleBack();
          }
          break;

      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentTime,
    duration,
    isLive,
    onBack,
    onNextChannel,
    onPrevChannel,
    tracksModalOpen,
    zapListOpen,
    channels,
    showOSD,
    volume,
    updateVolume,
    toggleMute,
    toggleFullscreen,
  ]);

  // Aplicar estilos de subtítulos dinámicos
  const subtitleFontSize =
    subtitleStyle.fontSize === 'small' ? '18px' : subtitleStyle.fontSize === 'large' ? '32px' : '24px';
  const subtitleColor =
    subtitleStyle.color === 'yellow' ? '#FACC15' : subtitleStyle.color === 'cyan' ? '#22D3EE' : '#FFFFFF';
  const subtitleBg =
    subtitleStyle.background === 'solid'
      ? '#000000'
      : subtitleStyle.background === 'semi'
      ? 'rgba(0, 0, 0, 0.75)'
      : 'transparent';

  // Interlineado dinámico
  const subtitleLineHeight =
    subtitleStyle.lineHeight === 'compact'
      ? '1.15'
      : subtitleStyle.lineHeight === 'relaxed'
      ? '1.6'
      : '1.35';

  // Borde / Contorno de texto dinámico
  const subtitleTextShadow =
    subtitleStyle.edgeStyle === 'none'
      ? 'none'
      : subtitleStyle.edgeStyle === 'shadow'
      ? '0 2px 4px rgba(0,0,0,0.9), 0 0 2px black'
      : '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 2px 4px rgba(0,0,0,0.8)';

  // Posición dinámica (Baja vs Media)
  const subtitlePositionOffset = subtitleStyle.position === 'middle' ? '45%' : '6%';

  // Badges informativos para el OSD
  const activeAudio = audioTracks.find((t) => String(t.id) === String(selectedAudioId));
  const activeAudioLabel = activeAudio
    ? activeAudio.lang && activeAudio.lang !== 'und'
      ? activeAudio.lang.toUpperCase()
      : activeAudio.name.length > 8
      ? activeAudio.name.slice(0, 8) + '..'
      : activeAudio.name
    : 'ORIGINAL';

  const isSubActive = selectedSubtitleId !== -1 && selectedSubtitleId !== '-1';
  const activeSub = isSubActive
    ? subtitleTracks.find((s) => String(s.id) === String(selectedSubtitleId))
    : null;
  const activeSubtitleLabel = activeSub
    ? activeSub.lang && activeSub.lang !== 'und'
      ? activeSub.lang.toUpperCase()
      : 'ON'
    : 'OFF';

  return (
    <div
      ref={containerRef}
      onMouseMove={showOSD}
      onClick={showOSD}
      onDoubleClick={(e) => {
        e.stopPropagation();
        toggleFullscreen();
      }}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none cursor-pointer"
    >
      {/* Dynamic Subtitle Style Tag (CSS estandarizado compatible con WebKit/Safari) */}
      <style>{`
        video::cue {
          font-size: ${subtitleFontSize} !important;
          color: ${subtitleColor} !important;
          background-color: ${subtitleBg} !important;
          font-family: 'Inter', sans-serif !important;
          font-weight: 700 !important;
          line-height: ${subtitleLineHeight} !important;
          text-shadow: ${subtitleTextShadow} !important;
        }
      `}</style>

      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        className={`w-full h-full transition-all duration-200 ${
          aspectRatio === 'contain'
            ? 'object-contain'
            : aspectRatio === 'cover'
            ? 'object-cover'
            : aspectRatio === '16:9'
            ? 'aspect-video object-fill'
            : 'aspect-[4/3] object-fill'
        }`}
      />

      {/* Subtítulos en Pantalla (Overlay Universal para Móvil, PC y Smart TV) */}
      {activeSubtitleText && (
        <div
          className="absolute pointer-events-none z-30 flex justify-center w-full px-4 text-center transition-all duration-150"
          style={{
            bottom: subtitleStyle.position === 'middle' ? '45%' : osdVisible ? '5.5rem' : '2.5rem',
          }}
        >
          <div
            style={{
              fontSize: subtitleFontSize,
              color: subtitleColor,
              backgroundColor: subtitleBg,
              lineHeight: subtitleLineHeight,
              textShadow: subtitleTextShadow,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              borderRadius: '0.375rem',
              padding: '0.25rem 0.75rem',
              maxWidth: '85%',
              whiteSpace: 'pre-line',
            }}
          >
            {activeSubtitleText}
          </div>
        </div>
      )}

      {/* Spinner de Carga */}
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-20 pointer-events-none">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-300">Cargando transmisión...</p>
        </div>
      )}

      {/* Mensaje de Error / Diagnóstico de Contenido Mixto */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-25 p-6 text-center animate-in fade-in duration-200">
          {typeof window !== 'undefined' && window.location.protocol === 'https:' ? (
            <div className="max-w-lg bg-surface/90 border border-white/10 rounded-2xl p-5 text-left shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Bloqueo de Navegador (Contenido Mixto)</h3>
                  <p className="text-[11px] text-slate-400">Protección estándar de Chrome/Edge en sitios HTTPS</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Para no saturar el servidor ni el túnel, la transmisión se conecta <strong>directamente al proveedor IPTV</strong> en HTTP plano. Tu navegador bloquea la conexión directa por seguridad.
              </p>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200 space-y-1.5 mb-3">
                <p className="font-bold text-amber-300 text-[11px]">💡 Para ver en este navegador (solo toma 10 segundos):</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                  <li>Haz clic en el icono de <strong>candado o ajustes</strong> a la izquierda de la URL en la barra de tu navegador.</li>
                  <li>Entra a <strong>Configuración del sitio</strong> (Site settings).</li>
                  <li>Busca <strong>Contenido no seguro</strong> (Insecure content) y cámbialo a <strong>Permitir</strong>.</li>
                  <li>Recarga la página y el canal se reproducirá al instante en Full HD directo.</li>
                </ol>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5 text-center">
                <p className="text-[11px] text-slate-300">
                  🏠 En tu hogar o Smart TV, puedes ver sin configurar nada abriendo:
                </p>
                <a
                  href="http://tv.gorofamily.com"
                  className="inline-block mt-1 text-xs font-mono font-bold text-blue-400 hover:text-blue-300 hover:underline"
                >
                  http://tv.gorofamily.com
                </a>
              </div>

            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Transmisión no disponible</h3>
              <p className="text-xs text-slate-400 max-w-md mb-6">{error}</p>
            </>
          )}

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                setCurrentUrlIndex(0);
                const vid = videoRef.current;
                if (vid) {
                  vid.currentTime = 0;
                }
                const evt = new CustomEvent('retry-playback');
                window.dispatchEvent(evt);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reintentar</span>
            </button>
            <button
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl bg-surfaceLight hover:bg-slate-700 text-white text-xs font-bold transition-all"
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {/* Zap List (Cajón lateral de selección rápida de canales en pantalla completa) */}
      {isLive && zapListOpen && channels && channels.length > 0 && (
        <div
          className="absolute inset-y-0 left-0 w-80 sm:w-96 bg-black/95 backdrop-blur-2xl border-r border-white/10 z-40 flex flex-col animate-in slide-in-from-left duration-200 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <Tv className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Lista de Canales</h4>
                <p className="text-[11px] text-slate-400">{channels.length} canales disponibles</p>
              </div>
            </div>
            <button
              type="button"
              data-nav="true"
              onClick={() => setZapListOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Cerrar lista"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {channels.map((ch, idx) => {
              const isCurrent = ch.name === title;
              return (
                <div
                  key={ch.stream_id}
                  data-nav="true"
                  tabIndex={0}
                  onClick={() => {
                    if (onSelectChannel) onSelectChannel(ch);
                    setZapListOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (onSelectChannel) onSelectChannel(ch);
                      setZapListOpen(false);
                    }
                  }}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isCurrent
                      ? 'bg-blue-600/30 border-blue-500 text-white font-bold shadow-md shadow-blue-500/10'
                      : 'border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="w-7 text-right text-xs font-mono text-slate-500 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-black border border-white/10 flex items-center justify-center overflow-hidden shrink-0 p-1">
                    {ch.stream_icon ? (
                      <img
                        src={ch.stream_icon}
                        alt=""
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Tv className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{ch.name}</p>
                  </div>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* On-Screen Display (OSD) */}
      <PlayerOSD
        visible={osdVisible}
        title={title}
        subtitle={subtitle}
        categoryName={categoryName}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSeek={handleSeek}
        onBack={handleBack}

        isLive={isLive}
        currentTime={currentTime}
        duration={duration}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        onOpenTracks={handleOpenTracksModal}
        aspectRatio={aspectRatio.toUpperCase()}
        onCycleAspectRatio={cycleAspectRatio}
        onPrevChannel={onPrevChannel}
        onNextChannel={onNextChannel}
        activeAudioLabel={activeAudioLabel}
        activeSubtitleLabel={activeSubtitleLabel}
        onOpenZapList={() => setZapListOpen(true)}
        hasZapList={isLive && !!channels && channels.length > 0}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={updateVolume}
        onToggleMute={toggleMute}
      />

      {/* Modal de Audio y Subtítulos */}
      <TracksModal
        isOpen={tracksModalOpen}
        onClose={() => setTracksModalOpen(false)}
        audioTracks={audioTracks}
        subtitleTracks={subtitleTracks}
        onSelectAudioTrack={handleSelectAudioTrack}
        onSelectSubtitleTrack={handleSelectSubtitleTrack}
        selectedAudioId={selectedAudioId}
        selectedSubtitleId={selectedSubtitleId}
        subtitleStyle={subtitleStyle}
        onChangeSubtitleStyle={setSubtitleStyle}
        initialTab={tracksInitialTab}
        onLoadCustomSubtitle={handleLoadCustomSubtitle}
        contentTitle={title}
        contentType={categoryName?.toLowerCase().includes('serie') ? 'series' : 'movie'}
        season={seasonNum}
        episode={episodeNum}
      />
    </div>
  );
};
