import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Tv,
  ArrowLeft,
  Ratio,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Headphones,
  List,
  Volume2,
  Volume1,
  VolumeX,
} from 'lucide-react';

interface PlayerOSDProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  categoryName?: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onBack: () => void;
  isLive: boolean;
  currentTime: number;
  duration: number;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onOpenTracks: (tab?: 'audio' | 'subtitles') => void;
  hasTracks?: boolean;
  aspectRatio: string;
  onCycleAspectRatio: () => void;
  onPrevChannel?: () => void;
  onNextChannel?: () => void;
  activeAudioLabel?: string;
  activeSubtitleLabel?: string;
  onOpenZapList?: () => void;
  hasZapList?: boolean;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (newVol: number) => void;
  onToggleMute: () => void;
}

export const PlayerOSD: React.FC<PlayerOSDProps> = ({
  visible,
  title,
  subtitle,
  categoryName,
  isPlaying,
  onTogglePlay,
  onSeek,
  onBack,
  isLive,
  currentTime,
  duration,
  onToggleFullscreen,
  isFullscreen,
  onOpenTracks,
  aspectRatio,
  onCycleAspectRatio,
  onPrevChannel,
  onNextChannel,
  activeAudioLabel,
  activeSubtitleLabel,
  onOpenZapList,
  hasZapList,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}) => {
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-t from-black/95 via-transparent to-black/85 transition-opacity duration-300 pointer-events-none ${
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0'
      }`}
    >
      {/* Top Bar: Back & Stream Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-nav="true"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-black/60 hover:bg-black text-white border border-white/10 backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base sm:text-lg tracking-tight truncate max-w-xs sm:max-w-md">
                {title}
              </span>
              {isLive ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-lg shadow-red-600/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  En Vivo
                </span>
              ) : (
                categoryName && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/10 text-slate-300 border border-white/10">
                    {categoryName}
                  </span>
                )
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-300 truncate max-w-sm sm:max-w-xl">{subtitle}</p>}
          </div>
        </div>

        {/* Top Right Quick Actions: Aspect Ratio & Zap list toggle */}
        <div className="flex items-center gap-2">
          {isLive && hasZapList && onOpenZapList && (
            <button
              type="button"
              data-nav="true"
              onClick={onOpenZapList}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-400/30 backdrop-blur-md text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-lg"
              title="Abrir Lista de Canales (Zap List)"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Guía Rápida</span>
            </button>
          )}

          {/* Relación de Aspecto */}
          <button
            type="button"
            data-nav="true"
            onClick={onCycleAspectRatio}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-black/60 hover:bg-black text-white border border-white/10 backdrop-blur-md text-xs font-mono font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Relación de Aspecto"
          >
            <Ratio className="w-4 h-4 text-slate-400" />
            <span>{aspectRatio}</span>
          </button>
        </div>
      </div>

      {/* Floating Center Chevrons (if live & has channel callbacks) */}
      {isLive && (onPrevChannel || onNextChannel) && (
        <div className="flex items-center justify-between pointer-events-none px-2 sm:px-6">
          {onPrevChannel && (
            <button
              type="button"
              data-nav="true"
              onClick={onPrevChannel}
              className="pointer-events-auto p-3.5 rounded-full bg-black/70 hover:bg-blue-600 text-white border border-white/15 backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xl transform hover:scale-110 active:scale-95"
              title="Canal Anterior (CH-)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {onNextChannel && (
            <button
              type="button"
              data-nav="true"
              onClick={onNextChannel}
              className="pointer-events-auto p-3.5 rounded-full bg-black/70 hover:bg-blue-600 text-white border border-white/15 backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xl transform hover:scale-110 active:scale-95 ml-auto"
              title="Canal Siguiente (CH+)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}

      {/* Bottom Bar: Timeline (if VOD) and Controls */}
      <div className="space-y-3">
        {/* Seek Bar (for VOD/Series) */}
        {!isLive && duration > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 px-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div
              className="relative h-2 bg-white/20 rounded-full cursor-pointer overflow-hidden group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                onSeek(pos * duration);
              }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls Row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Left Controls: Playback & Channel +/- */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isLive ? (
              <>
                {/* CH- Button */}
                {onPrevChannel && (
                  <button
                    type="button"
                    data-nav="true"
                    onClick={onPrevChannel}
                    className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-black/60 hover:bg-blue-600 text-white border border-white/10 backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95"
                    title="Canal Anterior (CH-)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-xs font-black tracking-wider">CH-</span>
                  </button>
                )}

                {/* Play / Pause */}
                <button
                  type="button"
                  data-nav="true"
                  onClick={onTogglePlay}
                  className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white"
                  title={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* CH+ Button */}
                {onNextChannel && (
                  <button
                    type="button"
                    data-nav="true"
                    onClick={onNextChannel}
                    className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-black/60 hover:bg-blue-600 text-white border border-white/10 backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95"
                    title="Canal Siguiente (CH+)"
                  >
                    <span className="text-xs font-black tracking-wider">CH+</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {/* Quick Channels Button */}
                {hasZapList && onOpenZapList && (
                  <button
                    type="button"
                    data-nav="true"
                    onClick={onOpenZapList}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Lista de Canales"
                  >
                    <Tv className="w-4 h-4 text-blue-400" />
                    <span className="hidden sm:inline">Canales</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {/* 10s Backward */}
                <button
                  type="button"
                  data-nav="true"
                  onClick={() => onSeek(currentTime - 10)}
                  className="p-2.5 rounded-xl bg-black/60 hover:bg-black text-white border border-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95"
                  title="Retroceder 10s"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Play / Pause */}
                <button
                  type="button"
                  data-nav="true"
                  onClick={onTogglePlay}
                  className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white"
                  title={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* 10s Forward */}
                <button
                  type="button"
                  data-nav="true"
                  onClick={() => onSeek(currentTime + 10)}
                  className="p-2.5 rounded-xl bg-black/60 hover:bg-black text-white border border-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95"
                  title="Adelantar 10s"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Control interactivo de Volumen */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-black/60 hover:bg-black/80 border border-white/10 rounded-xl px-2 sm:px-2.5 py-1.5 backdrop-blur-md transition-all">
              <button
                type="button"
                data-nav="true"
                onClick={onToggleMute}
                className="p-1 rounded-lg text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={isMuted ? 'Activar sonido (m)' : 'Silenciar (m)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4 text-slate-200" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  data-nav="true"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-14 sm:w-20 md:w-24 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  title={`Volumen: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                />
                <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-slate-300 w-7 sm:w-8 text-right hidden xs:inline sm:inline">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls: Subtitles [CC], Audio Language [ES], Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Botón dedicado de Subtítulos [CC] */}
            <button
              type="button"
              data-nav="true"
              onClick={() => onOpenTracks('subtitles')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 hover:bg-black text-white border border-white/10 backdrop-blur-md text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              title="Seleccionar Subtítulos"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Subtítulos</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {activeSubtitleLabel || 'CC'}
              </span>
            </button>

            {/* Botón dedicado de Idioma de Audio [ES] */}
            <button
              type="button"
              data-nav="true"
              onClick={() => onOpenTracks('audio')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 hover:bg-black text-white border border-white/10 backdrop-blur-md text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              title="Seleccionar Idioma de Audio"
            >
              <Headphones className="w-4 h-4 text-blue-400" />
              <span className="hidden md:inline">Audio</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 truncate max-w-[80px]">
                {activeAudioLabel || 'Original'}
              </span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              data-nav="true"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreen();
              }}
              className="p-2.5 rounded-xl bg-black/60 hover:bg-black text-white border border-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95"
              title={isFullscreen ? 'Salir de pantalla completa (f)' : 'Pantalla completa (f)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-blue-400" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
