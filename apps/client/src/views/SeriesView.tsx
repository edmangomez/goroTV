import React, { useState, useEffect, useRef } from 'react';
import { Clapperboard, Star, Play, X, Calendar, Layers, Loader2, Search, RotateCcw } from 'lucide-react';
import { Category, Series, SeriesDetailInfo, Episode, ClientSession, PlaybackProgress } from '../types';
import { XtreamApiClient } from '../services/xtreamApi';
import { FavoriteCategoryItem, localDB } from '../services/db';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { ContinueWatchingRow } from '../components/vod/ContinueWatchingRow';
import { progressApi } from '../services/progressApi';
import { isMkvOrNeedsBridge, buildVodBridgeUrl } from '../utils/vodStreamHelper';

interface SeriesViewProps {
  session: ClientSession;
  searchQuery: string;
}

export const SeriesView: React.FC<SeriesViewProps> = ({ session, searchQuery }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [favCategories, setFavCategories] = useState<FavoriteCategoryItem[]>([]);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [mobileCatModalOpen, setMobileCatModalOpen] = useState(false);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);

  // Detalle y episodios
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [seriesDetail, setSeriesDetail] = useState<SeriesDetailInfo | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('1');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [seriesProgressList, setSeriesProgressList] = useState<PlaybackProgress[]>([]);

  // Reproductor
  const [playingEpisode, setPlayingEpisode] = useState<{
    seriesTitle: string;
    episodeTitle: string;
    url: string;
    fallbackUrls?: string[];
    initialTime?: number;
    seriesId?: number;
    episodeId?: number;
    seasonNum?: number;
    episodeNum?: number;
    posterUrl?: string;
    containerExtension?: string;
    durationSecs?: number;
  } | null>(null);

  const [favorites, setFavorites] = useState<{ [id: number]: boolean }>({});

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const xtream = new XtreamApiClient(session.provider);


  // Cargar categorías, favoritos y categorías favoritas iniciales
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingCats(true);
      try {
        const [cats, favs, catFavs] = await Promise.all([
          xtream.getSeriesCategories(),
          localDB.getFavorites('series'),
          localDB.getFavoriteCategories('series'),
        ]);

        if (!isMounted) return;
        setCategories(cats);
        setFavCategories(catFavs);

        const favMap: { [id: number]: boolean } = {};
        favs.forEach((f) => (favMap[f.streamId] = true));
        setFavorites(favMap);

        // Selecciona automáticamente la primera categoría disponible (no 'all')
        if (cats.length > 0) {
          setSelectedCatId(cats[0].category_id);
        }
      } catch (err) {
        console.error('Error al cargar series:', err);
      } finally {
        if (isMounted) setLoadingCats(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Cargar series cuando cambia la categoría seleccionada (carga bajo demanda)
  useEffect(() => {
    if (!selectedCatId) return;
    let isMounted = true;
    async function fetchSeries() {
      setLoadingSeries(true);
      try {
        const list = await xtream.getSeries(selectedCatId);
        if (!isMounted) return;
        setSeriesList(list);
        setVisibleCount(30);
      } catch (err) {
        console.error('Error al cargar series:', err);
      } finally {
        if (isMounted) setLoadingSeries(false);
      }
    }
    fetchSeries();
    return () => {
      isMounted = false;
    };
  }, [selectedCatId]);

  // Resetear paginación al cambiar búsqueda global
  useEffect(() => {
    setVisibleCount(30);
  }, [searchQuery]);

  // Toggle categoría favorita
  const isCatFav = (catId: string) => favCategories.some((fc) => fc.categoryId === catId);

  const toggleCategoryFavorite = async (catId: string, catName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const favId = `series_${catId}`;
    if (isCatFav(catId)) {
      await localDB.removeFavoriteCategory(favId);
      setFavCategories((prev) => prev.filter((fc) => fc.categoryId !== catId));
    } else {
      await localDB.addFavoriteCategory('series', catId, catName);
      const updated = await localDB.getFavoriteCategories('series');
      setFavCategories(updated);
    }
  };

  // Filtrado de categorías por buscador de categorías
  const filteredCategories = categories.filter((c) =>
    c.category_name.toLowerCase().includes(catSearchQuery.toLowerCase())
  );

  const filteredFavCategories = favCategories.filter((fc) =>
    fc.name.toLowerCase().includes(catSearchQuery.toLowerCase())
  );

  // Filtrado de series por buscador global
  const filteredSeries = seriesList.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Límite de series según scroll infinito
  const displayedSeries = filteredSeries.slice(0, visibleCount);

  // Observer para scroll infinito en lotes de 30
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => {
            if (prev < filteredSeries.length) {
              return Math.min(prev + 30, filteredSeries.length);
            }
            return prev;
          });
        }
      },
      { rootMargin: '300px' }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
      observer.disconnect();
    };
  }, [filteredSeries.length, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 300) {
      if (visibleCount < filteredSeries.length) {
        setVisibleCount((prev) => Math.min(prev + 30, filteredSeries.length));
      }
    }
  };

  const handleOpenDetail = async (series: Series) => {
    setSelectedSeries(series);
    setLoadingDetail(true);
    try {
      const [info, progressList] = await Promise.all([
        xtream.getSeriesInfo(series.series_id),
        progressApi.getProgress('series'),
      ]);
      setSeriesDetail(info);
      setSeriesProgressList(progressList);
      const firstSeason = info.seasons?.[0]?.season_number ? String(info.seasons[0].season_number) : '1';
      setSelectedSeason(firstSeason);
    } catch (err) {
      console.error('Error al cargar detalle de serie:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePlayEpisode = (series: Series, ep: Episode, initialTime = 0) => {
    const ext = ep.container_extension || 'mkv';
    const directUrl = xtream.getSeriesStreamUrl(Number(ep.id), ext);
    const seasonNumber = Number(ep.season || selectedSeason);
    const needsBridge = isMkvOrNeedsBridge(ext);

    if (needsBridge) {
      const bridgeUrl = buildVodBridgeUrl(session, 'series', Number(ep.id), ext, 0, initialTime);
      setPlayingEpisode({
        seriesTitle: series.name,
        episodeTitle: `T${seasonNumber}:E${ep.episode_num} - ${ep.title}`,
        url: bridgeUrl,
        fallbackUrls: [directUrl],
        initialTime,
        seriesId: Number(series.series_id),
        episodeId: Number(ep.id),
        seasonNum: seasonNumber,
        episodeNum: Number(ep.episode_num),
        posterUrl: ep.info?.movie_image || series.cover,
        containerExtension: ext,
        durationSecs: ep.info?.duration_secs,
      });
    } else {
      const bridgeFallback = buildVodBridgeUrl(session, 'series', Number(ep.id), ext, 0, initialTime);
      setPlayingEpisode({
        seriesTitle: series.name,
        episodeTitle: `T${seasonNumber}:E${ep.episode_num} - ${ep.title}`,
        url: directUrl,
        fallbackUrls: [bridgeFallback],
        initialTime,
        seriesId: Number(series.series_id),
        episodeId: Number(ep.id),
        seasonNum: seasonNumber,
        episodeNum: Number(ep.episode_num),
        posterUrl: ep.info?.movie_image || series.cover,
        containerExtension: ext,
        durationSecs: ep.info?.duration_secs,
      });
    }
  };

  // Continuidad inteligente de series: al completar (>90%) un episodio, avanzar al siguiente
  const handleEpisodeCompleted = async (seriesId: number, seasonNum: number, currentEpNum: number) => {
    try {
      const episodesCurrentSeason = seriesDetail?.episodes?.[String(seasonNum)] || [];
      let nextEp = episodesCurrentSeason.find((e) => Number(e.episode_num) === currentEpNum + 1);
      let nextSeasonNum = seasonNum;

      if (!nextEp && seriesDetail?.episodes) {
        nextSeasonNum = seasonNum + 1;
        const nextSeasonEpisodes = seriesDetail.episodes[String(nextSeasonNum)] || [];
        if (nextSeasonEpisodes.length > 0) {
          nextEp = nextSeasonEpisodes[0];
        }
      }

      if (nextEp && selectedSeries) {
        await progressApi.saveProgress({
          contentType: 'series',
          streamId: Number(nextEp.id),
          seriesId: Number(seriesId),
          seasonNum: nextSeasonNum,
          episodeNum: Number(nextEp.episode_num),
          episodeId: Number(nextEp.id),
          title: selectedSeries.name,
          subtitle: `T${nextSeasonNum}:E${nextEp.episode_num} - ${nextEp.title}`,
          posterUrl: nextEp.info?.movie_image || selectedSeries.cover,
          progressSeconds: 0,
          durationSeconds: 1,
        }, true);
      }
    } catch (err) {
      console.warn('[SeriesView] Error al auto-avanzar episodio:', err);
    }
  };

  const toggleFavorite = async (series: Series) => {
    const favId = `series_${series.series_id}`;
    const isFav = !!favorites[series.series_id];

    if (isFav) {
      await localDB.removeFavorite(favId);
      setFavorites((prev) => ({ ...prev, [series.series_id]: false }));
    } else {
      await localDB.addFavorite({
        id: favId,
        type: 'series',
        streamId: series.series_id,
        name: series.name,
        icon: series.cover,
        category_id: series.category_id,
      });
      setFavorites((prev) => ({ ...prev, [series.series_id]: true }));
    }
  };

  // Reproductor para episodio
  if (playingEpisode) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <VideoPlayer
          key={`episode-${playingEpisode.url}`}
          streamUrl={playingEpisode.url}
          fallbackUrls={playingEpisode.fallbackUrls}
          title={playingEpisode.seriesTitle}
          subtitle={playingEpisode.episodeTitle}
          categoryName="Serie"
          isLive={false}
          onBack={() => {
            setPlayingEpisode(null);
            progressApi.getProgress('series').then(setSeriesProgressList).catch(() => {});
          }}
          initialTime={playingEpisode.initialTime}
          contentType="series"
          streamId={playingEpisode.episodeId}
          seriesId={playingEpisode.seriesId}
          seasonNum={playingEpisode.seasonNum}
          episodeNum={playingEpisode.episodeNum}
          episodeId={playingEpisode.episodeId}
          posterUrl={playingEpisode.posterUrl}
          session={session}
          containerExtension={playingEpisode.containerExtension}
          totalDuration={playingEpisode.durationSecs}
          onProgress={(progSec, durSec) => {
            if (durSec > 0 && progSec / durSec >= 0.9 && playingEpisode.seriesId) {
              handleEpisodeCompleted(
                playingEpisode.seriesId,
                playingEpisode.seasonNum || 1,
                playingEpisode.episodeNum || 1
              );
            }
          }}
        />
      </div>
    );
  }


  const currentEpisodes: Episode[] =
    seriesDetail && seriesDetail.episodes ? seriesDetail.episodes[selectedSeason] || [] : [];

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full min-h-0 overflow-hidden">
      {/* Columna Lateral Izquierda: Categorías (Dual Desktop y Móvil) */}
      <div className="w-full lg:w-72 bg-surface/80 border-b lg:border-b-0 lg:border-r border-surfaceLight/60 flex flex-col flex-shrink-0 h-auto lg:h-full">
        {/* Cabecera y Buscador de Categorías */}
        <div className="p-3 border-b border-surfaceLight/60 space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Categorías Series
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

          {/* Opción Todas las Series */}
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
              <span>Todas las Series</span>
            </button>
          </div>

          {/* Todas las Categorías */}
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
          {/* Pill "Todas" */}
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
            Todas
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
                    : 'bg-surfaceLight/60 border-white/5 text-slate-300 hover:text-white'
                }`}
              >
                {cat.category_name}
              </button>
            );
          })}
        </div>

        {/* Modal "Ver todas las categorías" en Móvil/Tablet */}
        {mobileCatModalOpen && (
          <div
            role="dialog"
            data-modal="true"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setMobileCatModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-surface border border-surfaceLight rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
              {/* Header Modal */}
              <div className="p-4 border-b border-surfaceLight flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Todas las Categorías de Series</h3>
                </div>
                <button
                  type="button"
                  data-nav="true"
                  data-modal-close="true"
                  onClick={() => setMobileCatModalOpen(false)}
                  className="p-1.5 rounded-xl bg-surfaceLight/60 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Buscador dentro del modal */}
              <div className="p-3 border-b border-surfaceLight/40">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={catSearchQuery}
                    onChange={(e) => setCatSearchQuery(e.target.value)}
                    placeholder="Filtrar categorías..."
                    className="w-full pl-8 pr-3 py-1.5 bg-background border border-surfaceLight rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Lista Vertical con Scroll en Modal */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                  Todas las Series
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
      </div>

      {/* Grid de Series con Scroll Infinito */}
      <div
        className="flex-1 p-4 sm:p-6 overflow-y-auto h-full focus:outline-none"
        onScroll={handleScroll}
      >
        {/* Continuar Viendo Carrusel estilo Netflix */}
        <ContinueWatchingRow
          contentType="series"
          onPlayItem={(item) => {
            const ext = 'mkv';
            const directUrl = xtream.getSeriesStreamUrl(item.streamId, ext);
            const bridgeUrl = buildVodBridgeUrl(session, 'series', item.streamId, ext, 0, item.progressSeconds);
            const needsBridge = isMkvOrNeedsBridge(ext);
            setPlayingEpisode({
              seriesTitle: item.title,
              episodeTitle: item.subtitle || 'Episodio',
              url: needsBridge ? bridgeUrl : directUrl,
              fallbackUrls: needsBridge ? [directUrl] : [bridgeUrl],
              initialTime: item.progressSeconds,
              seriesId: item.seriesId,
              episodeId: item.streamId,
              seasonNum: item.seasonNum,
              episodeNum: item.episodeNum,
              posterUrl: item.posterUrl,
              containerExtension: ext,
            });
          }}
          onOpenDetail={(item) => {
            if (item.seriesId) {
              const ser = seriesList.find((s) => s.series_id === item.seriesId) || {
                series_id: item.seriesId,
                name: item.title,
                cover: item.posterUrl || '',
                category_id: '',
                rating: 0,
                rating_5based: 0,
                backdrop_path: [],
                plot: '',
                cast: '',
                director: '',
                genre: '',
                releaseDate: '',
                last_modified: '',
              };
              handleOpenDetail(ser);

            }
          }}
        />

        {loadingSeries ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
            <span className="text-xs font-medium">Cargando catálogo de series...</span>
          </div>
        ) : filteredSeries.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
            No se encontraron series en esta categoría.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
              {displayedSeries.map((series) => {
                return (
                  <div
                    key={series.series_id}
                    data-nav="true"
                    tabIndex={0}
                    onClick={() => handleOpenDetail(series)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleOpenDetail(series);
                    }}
                    className="group relative bg-surface rounded-2xl overflow-hidden border border-surfaceLight/60 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:scale-[1.03]"
                  >
                    <div className="aspect-[2/3] w-full bg-background relative overflow-hidden">
                      {series.cover ? (
                        <img
                          src={series.cover}
                          alt={series.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" fill="%231E293B"><rect width="100" height="150"/><text x="50%" y="50%" fill="%2364748B" font-size="12" text-anchor="middle">Sin Imagen</text></svg>';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Clapperboard className="w-8 h-8" />
                        </div>
                      )}

                      {Number(series.rating_5based) > 0 && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[11px] font-bold text-amber-400 flex items-center gap-1 border border-white/10">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{Number(series.rating_5based).toFixed(1)}</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 transform scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="p-3">
                      <h3 className="text-xs sm:text-sm font-bold text-white truncate" title={series.name}>
                        {series.name}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Elemento centinela para scroll infinito */}
            <div ref={sentinelRef} className="h-6 w-full flex items-center justify-center mt-4">
              {visibleCount < filteredSeries.length && (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span>Cargando más series ({visibleCount} de {filteredSeries.length})...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal de Detalle de Serie & Selector de Episodios */}
      {selectedSeries && (
        <div
          role="dialog"
          data-modal="true"
          onClick={() => {
            setSelectedSeries(null);
            setSeriesDetail(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-surfaceLight rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
          >
            <button
              onClick={() => {
                setSelectedSeries(null);
                setSeriesDetail(null);
              }}
              data-nav="true"
              data-modal-close="true"
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black text-white border border-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingDetail ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Header de la serie */}
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="w-36 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden bg-background border border-surfaceLight flex-shrink-0 shadow-xl">
                    <img
                      src={selectedSeries.cover}
                      alt={selectedSeries.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <h2 className="text-xl font-black text-white leading-tight">
                      {selectedSeries.name}
                    </h2>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      {seriesDetail?.info?.releaseDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          <span>{seriesDetail.info.releaseDate}</span>
                        </div>
                      )}
                      {seriesDetail?.info?.genre && (
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                          {seriesDetail.info.genre}
                        </span>
                      )}
                      <button
                        type="button"
                        data-nav="true"
                        onClick={() => toggleFavorite(selectedSeries)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          favorites[selectedSeries.series_id]
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'bg-surfaceLight border-surfaceLight text-slate-300'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${favorites[selectedSeries.series_id] ? 'fill-current' : ''}`} />
                        <span>{favorites[selectedSeries.series_id] ? 'En Favoritos' : 'Favorito'}</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {seriesDetail?.info?.plot || 'Sinopsis no disponible.'}
                    </p>
                  </div>
                </div>

                {/* Selector de Temporada */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Temporadas
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {seriesDetail?.seasons && seriesDetail.seasons.length > 0 ? (
                      seriesDetail.seasons.map((season) => (
                        <button
                          key={season.season_number}
                          type="button"
                          data-nav="true"
                          onClick={() => setSelectedSeason(String(season.season_number))}
                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                            selectedSeason === String(season.season_number)
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                              : 'bg-background border-surfaceLight text-slate-400 hover:text-white'
                          }`}
                        >
                          {season.name || `Temporada ${season.season_number}`}
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        data-nav="true"
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white border border-blue-500"
                      >
                        Temporada 1
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de Episodios */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                    Episodios ({currentEpisodes.length})
                  </h4>

                  <div className="space-y-2">
                    {currentEpisodes.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-xs bg-background rounded-2xl border border-surfaceLight">
                        No hay episodios disponibles para esta temporada.
                      </div>
                    ) : (
                      currentEpisodes.map((ep) => {
                        const epProg = seriesProgressList.find(
                          (p) => p.streamId === Number(ep.id) && !p.completed && p.progressSeconds >= 10
                        );
                        const percent =
                          epProg && epProg.durationSeconds > 0
                            ? Math.min(100, Math.round((epProg.progressSeconds / epProg.durationSeconds) * 100))
                            : 0;

                        return (
                          <div
                            key={ep.id}
                            data-nav="true"
                            tabIndex={0}
                            onClick={() => handlePlayEpisode(selectedSeries, ep, epProg ? epProg.progressSeconds : 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handlePlayEpisode(selectedSeries, ep, epProg ? epProg.progressSeconds : 0);
                            }}
                            className="relative flex flex-col p-3.5 rounded-2xl bg-background border border-surfaceLight hover:border-blue-500/80 cursor-pointer transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                                    epProg
                                      ? 'bg-red-600/20 text-red-400 border border-red-500/30 group-hover:bg-red-600 group-hover:text-white'
                                      : 'bg-blue-600/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white'
                                  }`}
                                >
                                  {ep.episode_num}
                                </div>
                                <div className="overflow-hidden">
                                  <h5 className="text-xs sm:text-sm font-bold text-white truncate">
                                    {ep.title || `Episodio ${ep.episode_num}`}
                                  </h5>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {ep.info?.duration && (
                                      <span className="text-[11px] text-slate-400">{ep.info.duration}</span>
                                    )}
                                    {epProg && (
                                      <span className="text-[10px] text-red-400 font-semibold">
                                        Reanudar ({Math.floor(epProg.progressSeconds / 60)}:
                                        {String(Math.floor(epProg.progressSeconds % 60)).padStart(2, '0')})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {epProg && (
                                  <button
                                    type="button"
                                    data-nav="true"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePlayEpisode(selectedSeries, ep, 0);
                                    }}
                                    className="p-1.5 rounded-xl bg-surfaceLight hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-[11px] flex items-center gap-1"
                                    title="Ver desde el inicio"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Inicio</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className={`p-2 rounded-xl transition-all flex-shrink-0 ${
                                    epProg
                                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                      : 'bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white'
                                  }`}
                                  title={epProg ? 'Reanudar episodio' : 'Reproducir episodio'}
                                >
                                  <Play className="w-4 h-4 fill-current ml-0.5" />
                                </button>
                              </div>
                            </div>

                            {/* Barra de progreso de episodio si existe */}
                            {epProg && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                                <div
                                  className="h-full bg-red-600 transition-all duration-300"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })

                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
