import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  MessageSquare,
  Check,
  Sliders,
  Music,
  Headphones,
  Globe,
  UploadCloud,
  Search,
  Loader2,
  Download,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { MediaTrack, SubtitleStyle } from '../../types';
import { SubtitleStyleModal } from './SubtitleStyleModal';
import { formatLanguageName, formatAudioCodec, formatAudioChannels } from '../../utils/language';
import { createVttUrlFromFile } from '../../utils/subtitles';
import {
  searchOnlineSubtitles,
  downloadAndActivateSubtitle,
  cleanSearchTitle,
  OnlineSubtitle,
} from '../../services/subtitleSearch';

interface TracksModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioTracks: MediaTrack[];
  subtitleTracks: MediaTrack[];
  onSelectAudioTrack: (trackId: number | string) => void;
  onSelectSubtitleTrack: (trackId: number | string | -1) => void;
  selectedAudioId: number | string;
  selectedSubtitleId: number | string | -1;
  subtitleStyle: SubtitleStyle;
  onChangeSubtitleStyle: (style: SubtitleStyle) => void;
  initialTab?: 'audio' | 'subtitles' | 'online';
  onLoadCustomSubtitle?: (track: MediaTrack) => void;
  contentTitle?: string;
  contentType?: 'movie' | 'series';
  imdbId?: string;
  season?: number;
  episode?: number;
}

export const TracksModal: React.FC<TracksModalProps> = ({
  isOpen,
  onClose,
  audioTracks,
  subtitleTracks,
  onSelectAudioTrack,
  onSelectSubtitleTrack,
  selectedAudioId,
  selectedSubtitleId,
  subtitleStyle,
  onChangeSubtitleStyle,
  initialTab = 'audio',
  onLoadCustomSubtitle,
  contentTitle = '',
  contentType = 'movie',
  imdbId,
  season,
  episode,
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'subtitles' | 'online'>(initialTab);
  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Estados para búsqueda de subtítulos en línea
  const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
  const [onlineLangFilter, setOnlineLangFilter] = useState<'all' | 'es' | 'en' | 'other'>('all');
  const [onlineSubs, setOnlineSubs] = useState<OnlineSubtitle[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineSearchError, setOnlineSearchError] = useState<string | null>(null);
  const [downloadingSubId, setDownloadingSubId] = useState<string | null>(null);
  const [onlineSuccessMsg, setOnlineSuccessMsg] = useState<string | null>(null);
  const [hasAutoSearched, setHasAutoSearched] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Inicializar query cuando se abre con un título
  useEffect(() => {
    if (isOpen && contentTitle) {
      setOnlineSearchQuery(cleanSearchTitle(contentTitle));
    }
  }, [isOpen, contentTitle]);

  // Ejecutar búsqueda online
  const executeOnlineSearch = async (termToSearch: string) => {
    const term = termToSearch.trim();
    if (!term) return;

    setIsSearchingOnline(true);
    setOnlineSearchError(null);
    setOnlineSuccessMsg(null);

    try {
      const res = await searchOnlineSubtitles({
        title: term,
        type: contentType,
        imdbId,
        season,
        episode,
      });

      if (res && res.subtitles) {
        setOnlineSubs(res.subtitles);
        if (res.subtitles.length === 0) {
          setOnlineSearchError(
            res.message || `No se encontraron subtítulos en línea para "${term}". Intenta buscar con otro nombre.`
          );
        }
      } else {
        setOnlineSubs([]);
        setOnlineSearchError(res.message || 'No se recibieron subtítulos para esta búsqueda.');
      }
    } catch (err: any) {
      console.error('Error en búsqueda de subtítulos:', err);
      setOnlineSearchError(err?.message || 'Error de conexión al buscar subtítulos en línea.');
      setOnlineSubs([]);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Auto-buscar cuando el modal se abre con un título de contenido
  useEffect(() => {
    if (isOpen && !hasAutoSearched && contentTitle) {
      setHasAutoSearched(true);
      const clean = cleanSearchTitle(contentTitle);
      setOnlineSearchQuery(clean);
      executeOnlineSearch(clean);
    }
  }, [isOpen, hasAutoSearched, contentTitle]);

  useEffect(() => {
    setHasAutoSearched(false);
  }, [contentTitle]);

  // Descargar y activar subtítulo online
  const handleActivateOnlineSubtitle = async (sub: OnlineSubtitle) => {
    try {
      setDownloadingSubId(sub.id);
      setOnlineSearchError(null);
      const track = await downloadAndActivateSubtitle(sub);

      if (onLoadCustomSubtitle) {
        onLoadCustomSubtitle(track);
      }
      onSelectSubtitleTrack(track.id);

      setOnlineSuccessMsg(`Subtítulo "${sub.langName}" activado correctamente.`);
      setTimeout(() => setOnlineSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Error al descargar subtítulo:', err);
      setOnlineSearchError(`Error al descargar subtítulo: ${err.message || 'desconocido'}`);
    } finally {
      setDownloadingSubId(null);
    }
  };

  if (!isOpen) return null;

  // Filtrado por idioma en la pestaña online
  const filteredOnlineSubs = onlineSubs.filter((s) => {
    if (onlineLangFilter === 'es') return s.isSpanish;
    if (onlineLangFilter === 'en') return s.lang === 'eng' || s.lang === 'en';
    if (onlineLangFilter === 'other') return !s.isSpanish && s.lang !== 'eng' && s.lang !== 'en';
    return true;
  });

  const countEs = onlineSubs.filter((s) => s.isSpanish).length;
  const countEn = onlineSubs.filter((s) => s.lang === 'eng' || s.lang === 'en').length;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-surface border border-surfaceLight rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-surfaceLight flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                {activeTab === 'audio' ? (
                  <Volume2 className="w-4 h-4 text-blue-400" />
                ) : activeTab === 'online' ? (
                  <Globe className="w-4 h-4 text-cyan-400" />
                ) : (
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Audio y Subtítulos</h3>
                {contentTitle && (
                  <p className="text-[11px] text-slate-400 truncate max-w-xs">{contentTitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              data-nav="true"
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-surfaceLight transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-surfaceLight bg-background/50 p-1.5 gap-1 shrink-0">
            {/* Tab: Audio */}
            <button
              type="button"
              data-nav="true"
              onClick={() => setActiveTab('audio')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                activeTab === 'audio'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-surfaceLight/60'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Audio</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                  activeTab === 'audio' ? 'bg-blue-700 text-white' : 'bg-surface text-slate-400'
                }`}
              >
                {audioTracks.length > 0 ? audioTracks.length : '1'}
              </span>
            </button>

            {/* Tab: Subtítulos Embebidos / Locales */}
            <button
              type="button"
              data-nav="true"
              onClick={() => setActiveTab('subtitles')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                activeTab === 'subtitles'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-surfaceLight/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Subtítulos</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                  activeTab === 'subtitles' ? 'bg-emerald-700 text-white' : 'bg-surface text-slate-400'
                }`}
              >
                {subtitleTracks.length}
              </span>
            </button>

            {/* Tab: Buscar en Línea 🌐 */}
            <button
              type="button"
              data-nav="true"
              onClick={() => {
                setActiveTab('online');
                if (!hasAutoSearched && contentTitle) {
                  setHasAutoSearched(true);
                  const clean = cleanSearchTitle(contentTitle);
                  setOnlineSearchQuery(clean);
                  executeOnlineSearch(clean);
                }
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                activeTab === 'online'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-surfaceLight/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-300" />
              <span>Buscar Online</span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-cyan-500/20 text-cyan-300">
                Auto
              </span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* 1. TAB: AUDIO */}
            {activeTab === 'audio' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Pistas de Audio Disponibles
                  </span>
                  <span className="text-[11px] text-blue-400 font-medium">
                    {audioTracks.length > 0 ? `${audioTracks.length} pistas` : 'Audio estándar'}
                  </span>
                </div>

                {audioTracks.length === 0 ? (
                  <div className="p-4 bg-background/60 rounded-xl border border-blue-500/30 text-xs text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Music className="w-4 h-4 text-blue-400 shrink-0" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">Audio Original (Principal)</div>
                        <div className="text-[11px] text-slate-400">Pista activa directa del contenido</div>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-blue-400 stroke-[3]" />
                    </div>
                  </div>
                ) : (
                  audioTracks.map((track) => {
                    const isSelected = String(track.id) === String(selectedAudioId);
                    const displayName = formatLanguageName(track.lang, track.name || track.label);
                    const codecBadge = formatAudioCodec(track.codec);
                    const channelsBadge = formatAudioChannels(track.channels);

                    return (
                      <button
                        key={track.id}
                        type="button"
                        data-nav="true"
                        onClick={() => onSelectAudioTrack(track.id)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl text-xs font-semibold transition-all border text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                            : 'bg-background/60 border-surfaceLight text-slate-300 hover:border-slate-500 hover:text-white hover:bg-surfaceLight/50'
                        }`}
                      >
                        <div className="flex flex-col gap-1 min-w-0 pr-2">
                          <span className="font-bold text-white text-sm truncate">{displayName}</span>
                          {(codecBadge || channelsBadge || (track.lang && track.lang !== 'und')) && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {codecBadge && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono font-semibold">
                                  {codecBadge}
                                </span>
                              )}
                              {channelsBadge && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 text-[10px] font-mono">
                                  {channelsBadge}
                                </span>
                              )}
                              {track.lang && track.lang !== 'und' && (
                                <span className="text-[10px] text-slate-400 uppercase font-mono">
                                  [{track.lang}]
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-blue-400 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}

                {/* Callout informativo sobre audio en navegadores vs móviles */}
                {audioTracks.length <= 1 && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-slate-300 mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="font-semibold text-blue-300 text-xs">Pistas de audio en PC y Móvil</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      En navegadores de escritorio (Chrome/Edge en PC), los archivos directos utilizan la pista de audio principal. La detección y conmutación entre múltiples idiomas de audio internos está disponible en iPhone, iPad, Apple TV y Smart TVs con soporte nativo.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 2. TAB: SUBTÍTULOS ACTIVOS / EMBEBIDOS / LOCALES */}
            {activeTab === 'subtitles' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Opciones de Subtítulos
                  </span>

                  <button
                    type="button"
                    data-nav="true"
                    onClick={() => setStyleModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold focus:outline-none focus:underline"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Estilo visual</span>
                  </button>
                </div>

                {/* Banner de acceso directo a búsqueda online si no hay subtítulos o se quieren más */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">¿Buscas subtítulos en español?</p>
                      <p className="text-[10px] text-slate-300">Descarga automática desde OpenSubtitles</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-nav="true"
                    onClick={() => {
                      setActiveTab('online');
                      if (!hasAutoSearched && contentTitle) {
                        setHasAutoSearched(true);
                        const clean = cleanSearchTitle(contentTitle);
                        setOnlineSearchQuery(clean);
                        executeOnlineSearch(clean);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-white shadow-md shadow-cyan-600/20"
                  >
                    Buscar Online
                  </button>
                </div>

                {/* Botón para cargar subtítulo local (.srt o .vtt) */}
                <div>
                  <label
                    data-nav="true"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold cursor-pointer border border-dashed border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <UploadCloud className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs">Cargar subtítulo local (.srt / .vtt)</p>
                        <p className="text-[10px] text-slate-400">Desde tu computadora o dispositivo</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-600/30 text-emerald-300 text-[10px] font-bold">
                      Examinar
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".srt,.vtt"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const { url, name } = await createVttUrlFromFile(file);
                          const customTrack: MediaTrack = {
                            id: `custom_${Date.now()}`,
                            name: `Subtítulo: ${name}`,
                            lang: 'es',
                            type: 'subtitle',
                            active: true,
                            label: name,
                            url,
                          };
                          if (onLoadCustomSubtitle) {
                            onLoadCustomSubtitle(customTrack);
                          }
                          onSelectSubtitleTrack(customTrack.id);
                          setUploadSuccessMsg(`Subtítulo "${name}" cargado y activado.`);
                          setTimeout(() => setUploadSuccessMsg(null), 4000);
                        } catch (err) {
                          console.error('Error al procesar subtítulo:', err);
                        }
                      }}
                    />
                  </label>
                  {uploadSuccessMsg && (
                    <p className="text-[11px] text-emerald-400 font-semibold mt-1.5 px-1">
                      ✓ {uploadSuccessMsg}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  {/* Desactivar subtítulos */}
                  <button
                    type="button"
                    data-nav="true"
                    onClick={() => onSelectSubtitleTrack(-1)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      selectedSubtitleId === -1 || selectedSubtitleId === '-1'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                        : 'bg-background/60 border-surfaceLight text-slate-300 hover:border-slate-500 hover:text-white hover:bg-surfaceLight/50'
                    }`}
                  >
                    <span className="font-bold text-sm">Desactivar subtítulos</span>
                    {(selectedSubtitleId === -1 || selectedSubtitleId === '-1') && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                      </div>
                    )}
                  </button>

                  {subtitleTracks.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Subtítulos del Contenido
                      </span>
                      {subtitleTracks.map((track) => {
                        const isSelected = String(track.id) === String(selectedSubtitleId);
                        const subDisplayName = formatLanguageName(track.lang, track.name || track.label);
                        return (
                          <button
                            key={track.id}
                            type="button"
                            data-nav="true"
                            onClick={() => onSelectSubtitleTrack(track.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                              isSelected
                                ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                                : 'bg-background/60 border-surfaceLight text-slate-300 hover:border-slate-500 hover:text-white hover:bg-surfaceLight/50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="font-bold text-white text-sm truncate">{subDisplayName}</span>
                              {track.lang && track.lang !== 'und' && (
                                <span className="text-[10px] text-slate-400 uppercase font-mono bg-surfaceLight px-1.5 py-0.5 rounded shrink-0">
                                  [{track.lang}]
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Sección integrada: Subtítulos en Línea Disponibles (OpenSubtitles) */}
                  <div className="pt-3 border-t border-surfaceLight/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        Subtítulos en Línea Disponibles
                      </span>
                      {onlineSubs.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {onlineSubs.length} encontrados
                        </span>
                      )}
                    </div>

                    {isSearchingOnline && (
                      <div className="p-3 bg-surfaceLight/30 rounded-xl flex items-center gap-2.5 text-xs text-slate-300">
                        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                        <span>Buscando subtítulos automáticos en español e inglés...</span>
                      </div>
                    )}

                    {!isSearchingOnline && onlineSubs.length === 0 && subtitleTracks.length === 0 && (
                      <div className="p-3.5 bg-background/40 rounded-xl border border-surfaceLight text-xs text-slate-400 flex items-center gap-2.5">
                        <MessageSquare className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>No se detectaron subtítulos automáticos. Usa la pestaña "Buscar Online" arriba para buscar por nombre.</span>
                      </div>
                    )}

                    {!isSearchingOnline && onlineSubs.length > 0 && (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {onlineSubs.slice(0, 8).map((sub) => {
                          const isDownloading = downloadingSubId === sub.id;
                          const isThisActive = subtitleTracks.some(
                            (t) => String(t.id).includes(sub.id) && String(t.id) === String(selectedSubtitleId)
                          );

                          return (
                            <div
                              key={sub.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                                isThisActive
                                  ? 'bg-cyan-600/20 border-cyan-500 text-white'
                                  : 'bg-background/40 border-surfaceLight/80 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      sub.isSpanish
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-blue-500/20 text-blue-300'
                                    }`}
                                  >
                                    {sub.langName}
                                  </span>
                                </div>
                                <p className="text-[11px] font-medium truncate text-white">{sub.name}</p>
                              </div>

                              <button
                                type="button"
                                data-nav="true"
                                disabled={isDownloading || isThisActive}
                                onClick={() => handleActivateOnlineSubtitle(sub)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${
                                  isThisActive
                                    ? 'bg-cyan-500/30 text-cyan-300 cursor-default'
                                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20'
                                }`}
                              >
                                {isDownloading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : isThisActive ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Activo</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Activar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. TAB: BUSCAR SUBTÍTULOS EN LÍNEA 🌐 */}
            {activeTab === 'online' && (
              <div className="space-y-3.5">
                {/* Search Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    executeOnlineSearch(onlineSearchQuery);
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      data-nav="true"
                      value={onlineSearchQuery}
                      onChange={(e) => setOnlineSearchQuery(e.target.value)}
                      placeholder="Título de la película o serie..."
                      className="w-full pl-9 pr-3 py-2 bg-background border border-surfaceLight rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <button
                    type="submit"
                    data-nav="true"
                    disabled={isSearchingOnline || !onlineSearchQuery.trim()}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-cyan-600/20 flex items-center gap-1.5 shrink-0 focus:outline-none focus:ring-2 focus:ring-white"
                  >
                    {isSearchingOnline ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>Buscar</span>
                  </button>
                </form>

                {/* Filtros de Idioma */}
                {onlineSubs.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                      type="button"
                      data-nav="true"
                      onClick={() => setOnlineLangFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        onlineLangFilter === 'all'
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'bg-surfaceLight/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      Todos ({onlineSubs.length})
                    </button>
                    <button
                      type="button"
                      data-nav="true"
                      onClick={() => setOnlineLangFilter('es')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        onlineLangFilter === 'es'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-surfaceLight/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Español</span>
                      <span className="font-mono text-[10px]">({countEs})</span>
                    </button>
                    <button
                      type="button"
                      data-nav="true"
                      onClick={() => setOnlineLangFilter('en')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        onlineLangFilter === 'en'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-surfaceLight/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Inglés</span>
                      <span className="font-mono text-[10px]">({countEn})</span>
                    </button>
                    <button
                      type="button"
                      data-nav="true"
                      onClick={() => setOnlineLangFilter('other')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        onlineLangFilter === 'other'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-surfaceLight/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      Otros ({onlineSubs.length - countEs - countEn})
                    </button>
                  </div>
                )}

                {/* Mensaje de éxito al activar */}
                {onlineSuccessMsg && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-semibold flex items-center gap-2 animate-in fade-in">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{onlineSuccessMsg}</span>
                  </div>
                )}

                {/* Mensaje de error / informativo */}
                {onlineSearchError && !isSearchingOnline && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Búsqueda sin resultados</p>
                      <p className="text-[11px] text-amber-200/80">{onlineSearchError}</p>
                    </div>
                  </div>
                )}

                {/* Spinner de Carga */}
                {isSearchingOnline && (
                  <div className="py-8 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    <p className="text-xs text-slate-400 font-medium">
                      Buscando subtítulos en línea para "{onlineSearchQuery}"...
                    </p>
                  </div>
                )}

                {/* Lista de Resultados Encontrados */}
                {!isSearchingOnline && filteredOnlineSubs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Resultados de OpenSubtitles</span>
                      <span className="text-cyan-400">{filteredOnlineSubs.length} encontrados</span>
                    </div>

                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {filteredOnlineSubs.map((sub) => {
                        const isDownloading = downloadingSubId === sub.id;
                        return (
                          <div
                            key={sub.id}
                            className="p-3 rounded-xl bg-background/60 border border-surfaceLight hover:border-slate-500 flex items-center justify-between gap-2 transition-all"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                    sub.isSpanish
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : sub.lang === 'eng'
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      : 'bg-surfaceLight text-slate-300'
                                  }`}
                                >
                                  {sub.langName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">[{sub.lang}]</span>
                              </div>
                              <p className="text-xs text-white truncate font-medium" title={sub.name}>
                                {sub.name}
                              </p>
                            </div>

                            <button
                              type="button"
                              data-nav="true"
                              disabled={isDownloading}
                              onClick={() => handleActivateOnlineSubtitle(sub)}
                              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20 focus:outline-none focus:ring-2 focus:ring-white shrink-0"
                            >
                              {isDownloading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Descargando...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Activar</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-surfaceLight flex justify-end shrink-0">
            <button
              type="button"
              data-nav="true"
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-white"
            >
              Listo
            </button>
          </div>
        </div>
      </div>

      <SubtitleStyleModal
        isOpen={styleModalOpen}
        onClose={() => setStyleModalOpen(false)}
        style={subtitleStyle}
        onChangeStyle={onChangeSubtitleStyle}
      />
    </>
  );
};
