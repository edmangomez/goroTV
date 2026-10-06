import React, { useState, useEffect } from 'react';
import { Star, Tv, Film, Clapperboard, Play, Trash2 } from 'lucide-react';
import { FavoriteItem, localDB } from '../services/db';
import { ClientSession } from '../types';
import { XtreamApiClient } from '../services/xtreamApi';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { isMkvOrNeedsBridge, buildVodBridgeUrl } from '../utils/vodStreamHelper';

interface FavoritesViewProps {
  session: ClientSession;
  searchQuery: string;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ session, searchQuery }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'live' | 'movie' | 'series'>('all');
  const [playingItem, setPlayingItem] = useState<{
    title: string;
    url: string;
    fallbackUrls?: string[];
    isLive: boolean;
    contentType?: 'movie' | 'series';
    streamId?: number;
    containerExtension?: string;
  } | null>(null);

  const xtream = new XtreamApiClient(session.provider);

  const loadFavorites = async () => {
    const list = await localDB.getFavorites();
    setFavorites(list);
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await localDB.removeFavorite(id);
    await loadFavorites();
  };

  const handlePlay = (item: FavoriteItem) => {
    if (item.type === 'live') {
      const url = xtream.getLiveStreamUrl(item.streamId);
      setPlayingItem({ title: item.name, url, isLive: true, streamId: item.streamId });
    } else if (item.type === 'movie') {
      const ext = 'mp4';
      const directUrl = xtream.getMovieStreamUrl(item.streamId, ext);
      const bridgeUrl = buildVodBridgeUrl(session, 'movie', item.streamId, ext);
      setPlayingItem({
        title: item.name,
        url: directUrl,
        fallbackUrls: [bridgeUrl],
        isLive: false,
        contentType: 'movie',
        streamId: item.streamId,
        containerExtension: ext,
      });
    } else {
      const ext = 'mkv';
      const directUrl = xtream.getSeriesStreamUrl(item.streamId, ext);
      const bridgeUrl = buildVodBridgeUrl(session, 'series', item.streamId, ext);
      setPlayingItem({
        title: item.name,
        url: bridgeUrl,
        fallbackUrls: [directUrl],
        isLive: false,
        contentType: 'series',
        streamId: item.streamId,
        containerExtension: ext,
      });
    }
  };

  const filtered = favorites.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  if (playingItem) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <VideoPlayer
          streamUrl={playingItem.url}
          fallbackUrls={playingItem.fallbackUrls}
          title={playingItem.title}
          isLive={playingItem.isLive}
          contentType={playingItem.contentType}
          streamId={playingItem.streamId}
          containerExtension={playingItem.containerExtension}
          session={session}
          onBack={() => setPlayingItem(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto h-full min-h-0">
      {/* Filtros */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { id: 'all', label: 'Todos los Favoritos' },
          { id: 'live', label: 'Canales en Vivo' },
          { id: 'movie', label: 'Películas' },
          { id: 'series', label: 'Series' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-nav="true"
            data-nav-col="categories"
            data-nav-selected={filterType === tab.id ? 'true' : undefined}
            onClick={() => setFilterType(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterType === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-surface text-slate-400 hover:text-white border border-surfaceLight/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
          <Star className="w-8 h-8 text-slate-600 mb-2" />
          No tienes elementos guardados en favoritos.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((item) => {
            const Icon = item.type === 'live' ? Tv : item.type === 'movie' ? Film : Clapperboard;

            return (
              <div
                key={item.id}
                data-nav="true"
                data-nav-col="content"
                tabIndex={0}
                onClick={() => handlePlay(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePlay(item);
                }}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-surfaceLight/60 hover:border-blue-500 cursor-pointer transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-11 h-11 rounded-xl bg-background border border-surfaceLight flex items-center justify-center p-1 flex-shrink-0">
                    {item.icon ? (
                      <img src={item.icon} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Icon className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">{item.name}</h4>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">
                      {item.type === 'live' ? 'En Vivo' : item.type === 'movie' ? 'Película' : 'Serie'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleRemove(item.id, e)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Quitar de favoritos"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-xl bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
