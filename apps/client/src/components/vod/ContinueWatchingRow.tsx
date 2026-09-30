import React, { useEffect, useState } from 'react';
import { Play, X, Clock, Film, Tv } from 'lucide-react';
import { PlaybackProgress } from '../../types';
import { progressApi } from '../../services/progressApi';

interface ContinueWatchingRowProps {
  contentType: 'movie' | 'series';
  onPlayItem: (item: PlaybackProgress) => void;
  onOpenDetail?: (item: PlaybackProgress) => void;
}

function formatRemainingTime(progressSec: number, durationSec: number): string {
  if (!durationSec || durationSec <= 0) {
    const mins = Math.floor(progressSec / 60);
    return `${mins} min`;
  }
  const remaining = Math.max(0, durationSec - progressSec);
  const remMinutes = Math.floor(remaining / 60);
  if (remMinutes >= 60) {
    const h = Math.floor(remMinutes / 60);
    const m = remMinutes % 60;
    return `Faltan ${h}h ${m > 0 ? `${m}m` : ''}`;
  }
  return `Faltan ${remMinutes} min`;
}

export const ContinueWatchingRow: React.FC<ContinueWatchingRowProps> = ({
  contentType,
  onPlayItem,
  onOpenDetail,
}) => {
  const [items, setItems] = useState<PlaybackProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    try {
      const data = await progressApi.getProgress(contentType);
      // Solo mostrar los que no estén completados y tengan al menos 10 segundos
      const active = data.filter((item) => !item.completed && item.progressSeconds >= 10);
      setItems(active);
    } catch (err) {
      console.warn('[ContinueWatchingRow] Error al cargar progreso:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // Escuchar evento personalizado o polling ligero al volver a la vista
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadItems();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [contentType]);

  const handleDismiss = async (e: React.MouseEvent, item: PlaybackProgress) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((p) => p.streamId !== item.streamId));
    try {
      await progressApi.deleteProgress(item.contentType, item.streamId);
    } catch (err) {
      console.error('Error al descartar de continuar viendo:', err);
    }
  };

  if (loading || items.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-6 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-600/20 text-red-500">
            <Clock className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
            Continuar viendo
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-surfaceLight text-slate-400 font-mono">
            {items.length}
          </span>
        </div>
      </div>

      {/* Carrusel horizontal */}
      <div className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-surfaceLight/80 scrollbar-track-transparent">
        {items.map((item) => {
          const percent =
            item.durationSeconds > 0
              ? Math.min(100, Math.round((item.progressSeconds / item.durationSeconds) * 100))
              : 0;

          return (
            <div
              key={`${item.contentType}-${item.streamId}`}
              className="group relative flex-shrink-0 w-44 sm:w-56 bg-surface/90 border border-surfaceLight/70 rounded-2xl overflow-hidden hover:border-red-500/50 transition-all duration-200 hover:shadow-xl hover:shadow-red-950/20 flex flex-col cursor-pointer"
              onClick={() => (onOpenDetail ? onOpenDetail(item) : onPlayItem(item))}
            >
              {/* Imagen de póster con badge de tiempo restante */}
              <div className="relative aspect-[16/9] w-full bg-background overflow-hidden">
                {item.posterUrl ? (
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surfaceLight/40 text-slate-500">
                    {contentType === 'movie' ? (
                      <Film className="w-8 h-8 opacity-40" />
                    ) : (
                      <Tv className="w-8 h-8 opacity-40" />
                    )}
                  </div>
                )}

                {/* Botón flotante de reproducción en hover / D-Pad */}
                <button
                  type="button"
                  data-nav="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayItem(item);
                  }}
                  className="absolute inset-0 m-auto w-11 h-11 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform transform scale-90 sm:scale-0 group-hover:scale-100 focus:scale-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                  title="Reanudar ahora"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </button>

                {/* Botón X para descartar */}
                <button
                  type="button"
                  data-nav="true"
                  onClick={(e) => handleDismiss(e, item)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 hover:bg-red-600 text-slate-300 hover:text-white transition-colors opacity-90 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Quitar de continuar viendo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Badge de tiempo restante */}
                <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-medium text-slate-300 border border-white/10">
                  {formatRemainingTime(item.progressSeconds, item.durationSeconds)}
                </div>

                {/* Barra de progreso estilo Netflix */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
                  <div
                    className="h-full bg-red-600 transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Título y subtítulo */}
              <div className="p-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-surfaceLight/40 text-[10px] text-slate-400">
                  <span>{percent}% visto</span>
                  <span className="text-red-400 font-semibold flex items-center gap-0.5 hover:underline">
                    Reanudar
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
