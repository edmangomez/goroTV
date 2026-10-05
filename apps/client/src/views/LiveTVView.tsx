import React, { useState, useEffect, useRef } from 'react';
import { Tv, Star, Loader2, Play, Search, Layers, X } from 'lucide-react';
import { Category, Channel, EPGProgramme, ClientSession } from '../types';
import { XtreamApiClient } from '../services/xtreamApi';
import { FavoriteCategoryItem, localDB } from '../services/db';
import { VideoPlayer } from '../components/player/VideoPlayer';

interface LiveTVViewProps {
  session: ClientSession;
  searchQuery: string;
}

export const LiveTVView: React.FC<LiveTVViewProps> = ({ session, searchQuery }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [favCategories, setFavCategories] = useState<FavoriteCategoryItem[]>([]);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [mobileCatModalOpen, setMobileCatModalOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [activePlaybackChannel, setActivePlaybackChannel] = useState<Channel | null>(null);
  const [isFullscreenPlayer, setIsFullscreenPlayer] = useState(false);
  const [channelEPG, setChannelEPG] = useState<{ [id: number]: EPGProgramme | null }>({});
  const [favorites, setFavorites] = useState<{ [id: number]: boolean }>({});
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const xtream = new XtreamApiClient(session.provider);

  // Cargar categorías, canales favoritos y categorías favoritas iniciales
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      setLoadingCats(true);
      try {
        const [cats, favs, catFavs] = await Promise.all([
          xtream.getLiveCategories(),
          localDB.getFavorites('live'),
          localDB.getFavoriteCategories('live'),
        ]);

        if (!isMounted) return;
        setCategories(cats);
        setFavCategories(catFavs);

        const favMap: { [id: number]: boolean } = {};
        favs.forEach((f) => (favMap[f.streamId] = true));
        setFavorites(favMap);

        // Seleccionar automáticamente la primera categoría disponible para carga ultrarrápida (no 'all')
        if (catFavs.length > 0) {
          setSelectedCatId(catFavs[0].categoryId);
        } else if (cats.length > 0) {
          setSelectedCatId(cats[0].category_id);
        }
      } catch (err) {
        console.error('Error al cargar categorías:', err);
      } finally {
        if (isMounted) setLoadingCats(false);
      }
    }
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // Cargar canales cuando cambia la categoría seleccionada
  useEffect(() => {
    if (!selectedCatId) return;
    let isMounted = true;
    async function fetchChannels() {
      setLoadingChannels(true);
      try {
        const list = await xtream.getLiveStreams(selectedCatId);
        if (!isMounted) return;
        setChannels(list);
        setVisibleCount(40);
        if (list.length > 0) {
          setSelectedChannel(list[0]);
        }
      } catch (err) {
        console.error('Error al cargar canales:', err);
      } finally {
        if (isMounted) setLoadingChannels(false);
      }
    }
    fetchChannels();
    return () => {
      isMounted = false;
    };
  }, [selectedCatId]);

  // Cargar EPG del canal enfocado
  useEffect(() => {
    if (!selectedChannel) return;
    const streamId = selectedChannel.stream_id;
    if (channelEPG[streamId] !== undefined) return;

    xtream.getShortEPG(streamId).then((epgList) => {
      const current = epgList && epgList.length > 0 ? epgList[0] : null;
      setChannelEPG((prev) => ({ ...prev, [streamId]: current }));
    });
  }, [selectedChannel]);

  // Scroll Infinito con IntersectionObserver
  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const currentSentinel = sentinelRef.current;
    if (!currentSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 40, filteredChannels.length));
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(currentSentinel);
    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
      observer.disconnect();
    };
  }, [filteredChannels.length, visibleCount]);

  const handleChannelScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 300) {
      if (visibleCount < filteredChannels.length) {
        setVisibleCount((prev) => Math.min(prev + 40, filteredChannels.length));
      }
    }
  };

  // Toggle categoría favorita
  const isCatFav = (catId: string) => favCategories.some((fc) => fc.categoryId === catId);

  const toggleCategoryFavorite = async (catId: string, catName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const favId = `live_${catId}`;
    if (isCatFav(catId)) {
      await localDB.removeFavoriteCategory(favId);
      setFavCategories((prev) => prev.filter((fc) => fc.categoryId !== catId));
    } else {
      await localDB.addFavoriteCategory('live', catId, catName);
      const updated = await localDB.getFavoriteCategories('live');
      setFavCategories(updated);
    }
  };

  // Toggle favorito de canal
  const toggleFavorite = async (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation();
    const favId = `live_${channel.stream_id}`;
    const isFav = !!favorites[channel.stream_id];

    if (isFav) {
      await localDB.removeFavorite(favId);
      setFavorites((prev) => ({ ...prev, [channel.stream_id]: false }));
    } else {
      await localDB.addFavorite({
        id: favId,
        type: 'live',
        streamId: channel.stream_id,
        name: channel.name,
        icon: channel.stream_icon,
        category_id: channel.category_id,
      });
      setFavorites((prev) => ({ ...prev, [channel.stream_id]: true }));
    }
  };

  // Navegación Circular entre Canales (CH- / CH+)
  const handlePrevChannel = () => {
    if (filteredChannels.length === 0) return;
    const currentId = (activePlaybackChannel || selectedChannel)?.stream_id;
    let currentIndex = filteredChannels.findIndex((c) => c.stream_id === currentId);
    if (currentIndex < 0) currentIndex = 0;
    const prevIndex = (currentIndex - 1 + filteredChannels.length) % filteredChannels.length;
    const targetChan = filteredChannels[prevIndex];
    if (targetChan) {
      setSelectedChannel(targetChan);
      setActivePlaybackChannel(targetChan);
    }
  };

  const handleNextChannel = () => {
    if (filteredChannels.length === 0) return;
    const currentId = (activePlaybackChannel || selectedChannel)?.stream_id;
    let currentIndex = filteredChannels.findIndex((c) => c.stream_id === currentId);
    if (currentIndex < 0) currentIndex = 0;
    const nextIndex = (currentIndex + 1) % filteredChannels.length;
    const targetChan = filteredChannels[nextIndex];
    if (targetChan) {
      setSelectedChannel(targetChan);
      setActivePlaybackChannel(targetChan);
    }
  };

  // Filtrado por buscador de categorías
  const filteredCategories = categories.filter((c) =>
    c.category_name.toLowerCase().includes(catSearchQuery.toLowerCase())
  );

  const filteredFavCategories = favCategories.filter((fc) =>
    fc.name.toLowerCase().includes(catSearchQuery.toLowerCase())
  );

  // Canales visibles con scroll infinito
  const displayedChannels = filteredChannels.slice(0, visibleCount);

  // Reproductor a pantalla completa
  if (isFullscreenPlayer && activePlaybackChannel) {
    const streamUrl = xtream.getLiveStreamUrl(activePlaybackChannel.stream_id, 'm3u8');
    const fallbackUrl = xtream.getLiveStreamUrl(activePlaybackChannel.stream_id, 'ts');
    const currentEpg = channelEPG[activePlaybackChannel.stream_id];

    return (
      <div className="fixed inset-0 z-50 bg-black">
        <VideoPlayer
          key={`live-${activePlaybackChannel.stream_id}`}
          streamUrl={streamUrl}
          fallbackUrls={[fallbackUrl]}
          title={activePlaybackChannel.name}
          subtitle={currentEpg ? currentEpg.title : undefined}
          isLive={true}
          onBack={() => setIsFullscreenPlayer(false)}
          onNextChannel={handleNextChannel}
          onPrevChannel={handlePrevChannel}
          channels={filteredChannels}
          onSelectChannel={(ch) => {
            setSelectedChannel(ch);
            setActivePlaybackChannel(ch);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full min-h-0 overflow-hidden">
      {/* Columna / Barra de Categorías */}
      <div className="w-full lg:w-72 bg-surface/80 border-b lg:border-b-0 lg:border-r border-surfaceLight/60 flex flex-col flex-shrink-0 h-auto lg:h-full">
        {/* Cabecera y Buscador de Categorías */}
        <div className="p-3 border-b border-surfaceLight/60 space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Categorías Canales
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {categories.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                data-nav="true"
                value={catSearchQuery}
                onChange={(e) => setCatSearchQuery(e.target.value)}
                placeholder="Buscar categoría..."
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-surfaceLight rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            {/* Botón para ver todas las categorías en modal en móvil/tablet */}
            <button
              type="button"
              data-nav="true"
              onClick={() => setMobileCatModalOpen(true)}
              className="lg:hidden px-2.5 py-1.5 rounded-xl bg-surfaceLight/70 hover:bg-surfaceLight text-slate-300 hover:text-white transition-colors flex items-center gap-1 shrink-0 text-xs font-bold border border-white/5"
              title="Ver todas las categorías"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Ver todas</span>
            </button>
          </div>
        </div>

        {/* 1. MODO DESKTOP (lg y superior): Lista vertical tradicional con scroll fluido */}
        <div className="hidden lg:flex flex-col p-2 gap-1 overflow-y-auto flex-1 scrollbar-thin">
          {/* Categorías Favoritas */}
          {filteredFavCategories.length > 0 && (
            <div className="mb-2 pb-2 border-b border-surfaceLight/40 w-full">
              <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                <Star className="w-3 h-3 fill-amber-400" />
                <span>Categorías Favoritas</span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                {filteredFavCategories.map((fc) => {
                  const isSelected = selectedCatId === fc.categoryId;
                  return (
                    <div
                      key={`fav_${fc.categoryId}`}
                      className="flex items-center gap-1 w-full"
                    >
                      <button
                        type="button"
                        data-nav="true"
                        onClick={() => setSelectedCatId(fc.categoryId)}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold text-left transition-all truncate ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-300 hover:text-white hover:bg-surfaceLight/40'
                        }`}
                      >
                        <span className="truncate block">{fc.name}</span>
                      </button>
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => toggleCategoryFavorite(fc.categoryId, fc.name, e)}
                        className="p-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-surfaceLight/40 transition-colors flex-shrink-0"
                        title="Quitar de favoritas"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Todas las Categorías */}
          <div className="w-full">
            <button
              type="button"
              data-nav="true"
              onClick={() => setSelectedCatId('all')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between whitespace-nowrap mb-1 ${
                selectedCatId === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-surfaceLight/40'
              }`}
            >
              <span>Todos los Canales</span>
            </button>
          </div>

          <div className="mt-1 pt-1 border-t border-surfaceLight/40 w-full">
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Todas las Categorías
            </div>
            {loadingCats ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 text-center">
                No se encontraron categorías
              </div>
            ) : (
              <div className="flex flex-col gap-1 mt-1">
                {filteredCategories.map((cat) => {
                  const isSelected = selectedCatId === cat.category_id;
                  const isFav = isCatFav(cat.category_id);
                  return (
                    <div
                      key={cat.category_id}
                      className="flex items-center gap-1 w-full"
                    >
                      <button
                        type="button"
                        data-nav="true"
                        onClick={() => setSelectedCatId(cat.category_id)}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold text-left transition-all truncate ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-surfaceLight/40'
                        }`}
                      >
                        <span className="truncate block">{cat.category_name}</span>
                      </button>
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => toggleCategoryFavorite(cat.category_id, cat.category_name, e)}
                        className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
                          isFav
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-slate-600 hover:text-amber-400 hover:bg-surfaceLight/40'
                        }`}
                        title={isFav ? 'Quitar de favoritas' : 'Marcar como favorita'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2. MODO RESPONSIVO (Móvil y Tablet < lg): Barra horizontal deslizable fluida (Horizontal Pills) */}
        <div className="lg:hidden flex items-center gap-1.5 p-2 overflow-x-auto scrollbar-none overscroll-x-contain touch-pan-x shrink-0 bg-background/50">
          {/* Pill "Todos" */}
          <button
            type="button"
            data-nav="true"
            onClick={() => setSelectedCatId('all')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              selectedCatId === 'all'
                ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'bg-surfaceLight/60 border-white/5 text-slate-300 hover:text-white'
            }`}
          >
            Todos
          </button>

          {/* Favoritas */}
          {filteredFavCategories.map((fc) => {
            const isSelected = selectedCatId === fc.categoryId;
            return (
              <button
                key={`m_fav_${fc.categoryId}`}
                type="button"
                data-nav="true"
                onClick={() => setSelectedCatId(fc.categoryId)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                }`}
              >
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{fc.name}</span>
              </button>
            );
          })}

          {/* Categorías Regulares */}
          {filteredCategories.map((cat) => {
            const isSelected = selectedCatId === cat.category_id;
            return (
              <button
                key={`m_cat_${cat.category_id}`}
                type="button"
                data-nav="true"
                onClick={() => setSelectedCatId(cat.category_id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-surfaceLight/60 border-white/5 text-slate-300 hover:text-white hover:bg-surfaceLight'
                }`}
              >
                {cat.category_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal de Categorías Completo para Móvil / Tablet */}
      {mobileCatModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileCatModalOpen(false)}
        >
          <div
            className="bg-surface border border-surfaceLight rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-surfaceLight flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-white text-base">Categorías de Canales</h3>
              </div>
              <button
                onClick={() => setMobileCatModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-surfaceLight"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-surfaceLight shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={catSearchQuery}
                  onChange={(e) => setCatSearchQuery(e.target.value)}
                  placeholder="Buscar categoría..."
                  className="w-full pl-9 pr-3 py-2 bg-background border border-surfaceLight rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => {
                  setSelectedCatId('all');
                  setMobileCatModalOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                  selectedCatId === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-surfaceLight/40'
                }`}
              >
                Todos los Canales
              </button>

              {filteredCategories.map((cat) => {
                const isSelected = selectedCatId === cat.category_id;
                const isFav = isCatFav(cat.category_id);
                return (
                  <div key={`modal_${cat.category_id}`} className="flex items-center gap-1 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCatId(cat.category_id);
                        setMobileCatModalOpen(false);
                      }}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all truncate ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-300 hover:bg-surfaceLight/40'
                      }`}
                    >
                      {cat.category_name}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleCategoryFavorite(cat.category_id, cat.category_name, e)}
                      className={`p-2 rounded-xl transition-colors ${
                        isFav ? 'text-amber-400' : 'text-slate-600'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Columna Central: Lista de Canales (TiviMate Style con Scroll Infinito) */}
      <div
        onScroll={handleChannelScroll}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 focus:outline-none"
      >
        {loadingChannels ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
            <span className="text-xs font-medium">Cargando canales al instante...</span>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
            No se encontraron canales en esta categoría.
          </div>
        ) : (
          <>
            {displayedChannels.map((channel, idx) => {
              const isSelected = selectedChannel?.stream_id === channel.stream_id;
              const isPlayingNow = activePlaybackChannel?.stream_id === channel.stream_id;
              const isFav = !!favorites[channel.stream_id];
              const epg = channelEPG[channel.stream_id];

              return (
                <div
                  key={channel.stream_id}
                  data-nav="true"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedChannel(channel);
                    setActivePlaybackChannel(channel);
                    setIsFullscreenPlayer(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSelectedChannel(channel);
                      setActivePlaybackChannel(channel);
                      setIsFullscreenPlayer(true);
                    }
                  }}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:scale-[1.01] ${
                    isSelected
                      ? 'bg-surface border-blue-500/80 shadow-lg shadow-blue-500/10'
                      : 'bg-surface/50 border-surfaceLight/40 hover:bg-surface hover:border-surfaceLight'
                  }`}
                >
                  {/* Left: Number, Logo & Channel Details */}
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="w-7 text-xs font-mono text-slate-500 text-right flex-shrink-0">
                      {idx + 1}
                    </span>

                    <div className="w-11 h-11 rounded-xl bg-background border border-surfaceLight flex items-center justify-center overflow-hidden flex-shrink-0 p-1 relative">
                      {channel.stream_icon ? (
                        <img
                          src={channel.stream_icon}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Tv className="w-5 h-5 text-slate-600" />
                      )}
                      {isPlayingNow && (
                        <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      )}
                    </div>

                    <div className="overflow-hidden">
                      <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                        <span>{channel.name}</span>
                        {isPlayingNow && (
                          <span className="text-[10px] font-black uppercase text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                            Al aire
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {epg ? epg.title : 'Guía de programación no disponible'}
                      </div>
                    </div>
                  </div>

                  {/* Right: Favorite button & Play Indicator */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(channel, e)}
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-400 transition-colors"
                      title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChannel(channel);
                        setActivePlaybackChannel(channel);
                        setIsFullscreenPlayer(true);
                      }}
                      className="p-2 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all"
                      title="Reproducir canal"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Sentinel para carga progresiva / scroll infinito */}
            <div ref={sentinelRef} className="h-6 flex items-center justify-center">
              {visibleCount < filteredChannels.length && (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
