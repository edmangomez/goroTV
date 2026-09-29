import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Tv,
  Film,
  Clapperboard,
  Play,
  Star,
  Calendar,
  Clock,
  Layers,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Channel,
  Movie,
  Series,
  MovieDetailInfo,
  SeriesDetailInfo,
  Episode,
  ClientSession,
} from '../types';
import { XtreamApiClient } from '../services/xtreamApi';
import { VideoPlayer } from '../components/player/VideoPlayer';

interface GlobalSearchViewProps {
  session: ClientSession;
}

type SearchFilter = 'all' | 'live' | 'movies' | 'series';

type PlaybackSource =
  | { type: 'live'; title: string; streamUrl: string; fallbackUrls?: string[] }
  | { type: 'movie'; title: string; streamUrl: string; fallbackUrls?: string[] }
  | { type: 'series'; title: string; subtitle: string; streamUrl: string; fallbackUrls?: string[] };

export const GlobalSearchView: React.FC<GlobalSearchViewProps> = ({ session }) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');

  // Datos globales descargados
  const [channels, setChannels] = useState<Channel[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);

  // Estados de carga
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reproductor activo
  const [playbackSource, setPlaybackSource] = useState<PlaybackSource | null>(null);

  // Modales de detalle
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieDetail, setMovieDetail] = useState<MovieDetailInfo | null>(null);
  const [loadingMovieDetail, setLoadingMovieDetail] = useState(false);

  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [seriesDetail, setSeriesDetail] = useState<SeriesDetailInfo | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('1');
  const [loadingSeriesDetail, setLoadingSeriesDetail] = useState(false);

  // Límites de visualización para máximo rendimiento
  const [visibleLiveLimit, setVisibleLiveLimit] = useState(30);
  const [visibleMoviesLimit, setVisibleMoviesLimit] = useState(30);
  const [visibleSeriesLimit, setVisibleSeriesLimit] = useState(30);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const xtream = useMemo(() => new XtreamApiClient(session.provider), [session.provider]);

  // Autofocus en el input al montar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Carga inicial paralela de canales, películas y series
  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      setIsLoadingCatalog(true);
      setLoadError(null);
      try {
        const [loadedChannels, loadedMovies, loadedSeries] = await Promise.all([
          xtream.getLiveStreams('all'),
          xtream.getVodStreams('all'),
          xtream.getSeries('all'),
        ]);

        if (!isMounted) return;
        setChannels(loadedChannels || []);
        setMovies(loadedMovies || []);
        setSeriesList(loadedSeries || []);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error al cargar catálogo para búsqueda global:', err);
        setLoadError('Hubo un inconveniente al cargar el catálogo de contenidos.');
      } finally {
        if (isMounted) {
          setIsLoadingCatalog(false);
        }
      }
    }

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [xtream]);

  // Reset de límites al cambiar la búsqueda
  useEffect(() => {
    setVisibleLiveLimit(30);
    setVisibleMoviesLimit(30);
    setVisibleSeriesLimit(30);
  }, [query]);

  // Filtrado reactivo
  const cleanQuery = query.trim().toLowerCase();

  const filteredChannels = useMemo(() => {
    if (!cleanQuery) return [];
    return channels.filter((c) => c.name.toLowerCase().includes(cleanQuery));
  }, [channels, cleanQuery]);

  const filteredMovies = useMemo(() => {
    if (!cleanQuery) return [];
    return movies.filter((m) => m.name.toLowerCase().includes(cleanQuery));
  }, [movies, cleanQuery]);

  const filteredSeries = useMemo(() => {
    if (!cleanQuery) return [];
    return seriesList.filter((s) => s.name.toLowerCase().includes(cleanQuery));
  }, [seriesList, cleanQuery]);

  const totalResultsCount =
    filteredChannels.length + filteredMovies.length + filteredSeries.length;

  // Acciones de reproducción
  const handlePlayChannel = (channel: Channel) => {
    const streamUrl = xtream.getLiveStreamUrl(channel.stream_id, 'm3u8');
    const fallbackUrl = xtream.getLiveStreamUrl(channel.stream_id, 'ts');
    setPlaybackSource({
      type: 'live',
      title: channel.name,
      streamUrl,
      fallbackUrls: [fallbackUrl],
    });
  };

  const handleOpenMovieDetail = async (movie: Movie) => {
    setSelectedMovie(movie);
    setLoadingMovieDetail(true);
    try {
      const info = await xtream.getVodInfo(movie.stream_id);
      setMovieDetail(info);
    } catch (err) {
      console.error('Error al cargar detalle de película:', err);
    } finally {
      setLoadingMovieDetail(false);
    }
  };

  const handlePlayMovieDirect = (movie: Movie) => {
    const streamUrl = xtream.getMovieStreamUrl(
      movie.stream_id,
      movie.container_extension || 'mp4'
    );
    setPlaybackSource({
      type: 'movie',
      title: movie.name,
      streamUrl,
    });
  };

  const handleOpenSeriesDetail = async (series: Series) => {
    setSelectedSeries(series);
    setLoadingSeriesDetail(true);
    try {
      const info = await xtream.getSeriesInfo(series.series_id);
      setSeriesDetail(info);
      const firstSeason = info.seasons?.[0]?.season_number
        ? String(info.seasons[0].season_number)
        : '1';
      setSelectedSeason(firstSeason);
    } catch (err) {
      console.error('Error al cargar detalle de serie:', err);
    } finally {
      setLoadingSeriesDetail(false);
    }
  };

  const handlePlayEpisode = (series: Series, ep: Episode) => {
    const streamUrl = xtream.getSeriesStreamUrl(
      Number(ep.id),
      ep.container_extension || 'mp4'
    );
    setPlaybackSource({
      type: 'series',
      title: series.name,
      subtitle: `T${selectedSeason}:E${ep.episode_num} - ${ep.title}`,
      streamUrl,
    });
  };

  // Reproductor a pantalla completa
  if (playbackSource) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <VideoPlayer
          key={`search-${playbackSource.type}-${playbackSource.streamUrl}`}
          streamUrl={playbackSource.streamUrl}
          fallbackUrls={playbackSource.fallbackUrls}
          title={playbackSource.title}
          subtitle={playbackSource.type === 'series' ? playbackSource.subtitle : undefined}
          categoryName={
            playbackSource.type === 'live'
              ? 'TV en Vivo'
              : playbackSource.type === 'movie'
              ? 'Película VOD'
              : 'Serie'
          }
          isLive={playbackSource.type === 'live'}
          onBack={() => setPlaybackSource(null)}
        />
      </div>
    );
  }

  // Episodios de la temporada seleccionada
  const currentEpisodes: Episode[] =
    seriesDetail?.episodes && seriesDetail.episodes[selectedSeason]
      ? seriesDetail.episodes[selectedSeason]
      : [];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-background">
      {/* Barra de Búsqueda y Filtros Superiores */}
      <div className="p-4 sm:p-6 bg-surface/70 border-b border-surfaceLight/60 flex-shrink-0 space-y-4">
        {/* Input Estilizado con Lupa y Limpieza */}
        <div className="max-w-4xl mx-auto relative flex items-center">
          <Search className="w-5 h-5 absolute left-4 text-blue-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            data-nav="true"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar canales de TV en vivo, películas, series..."
            className="w-full pl-12 pr-12 py-3.5 bg-background border border-surfaceLight rounded-2xl text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all shadow-inner"
          />
          {query && (
            <button
              type="button"
              data-nav="true"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-surfaceLight/60 transition-colors"
              title="Borrar texto"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Pestañas de Filtrado */}
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              data-nav="true"
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-surface border border-surfaceLight/60 text-slate-400 hover:text-white hover:bg-surfaceLight/50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Todos</span>
              {cleanQuery && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                  {totalResultsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              data-nav="true"
              onClick={() => setActiveFilter('live')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeFilter === 'live'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-surface border border-surfaceLight/60 text-slate-400 hover:text-white hover:bg-surfaceLight/50'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>TV en Vivo</span>
              {cleanQuery && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                  {filteredChannels.length}
                </span>
              )}
            </button>

            <button
              type="button"
              data-nav="true"
              onClick={() => setActiveFilter('movies')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeFilter === 'movies'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-surface border border-surfaceLight/60 text-slate-400 hover:text-white hover:bg-surfaceLight/50'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Películas</span>
              {cleanQuery && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                  {filteredMovies.length}
                </span>
              )}
            </button>

            <button
              type="button"
              data-nav="true"
              onClick={() => setActiveFilter('series')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeFilter === 'series'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-surface border border-surfaceLight/60 text-slate-400 hover:text-white hover:bg-surfaceLight/50'
              }`}
            >
              <Clapperboard className="w-3.5 h-3.5" />
              <span>Series</span>
              {cleanQuery && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                  {filteredSeries.length}
                </span>
              )}
            </button>
          </div>

          {isLoadingCatalog && (
            <div className="flex items-center gap-2 text-xs text-blue-400 font-medium animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Indexando catálogo de contenidos...</span>
            </div>
          )}
        </div>
      </div>

      {/* Área de Resultados con Scroll */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 focus:outline-none">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Si no ha escrito nada */}
          {!cleanQuery && (
            <div className="h-96 flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Buscador Global de goroTV</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
                Escribe el nombre de un canal, película o serie de TV para buscar instantáneamente
                en todo el catálogo.
              </p>
              {isLoadingCatalog && (
                <div className="mt-4 flex items-center gap-2 text-xs text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparando miles de títulos para búsqueda instantánea...</span>
                </div>
              )}
            </div>
          )}

          {/* Si escribió y no hay resultados */}
          {cleanQuery && totalResultsCount === 0 && !isLoadingCatalog && (
            <div className="h-96 flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-3xl bg-surfaceLight/40 flex items-center justify-center mb-4 text-slate-500">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                No se encontraron resultados para &ldquo;{query}&rdquo;
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Prueba con otro término o revisa que no haya errores tipográficos.
              </p>
            </div>
          )}

          {/* Sección 1: TV en Vivo */}
          {cleanQuery &&
            (activeFilter === 'all' || activeFilter === 'live') &&
            filteredChannels.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-surfaceLight/60 pb-2">
                  <div className="flex items-center gap-2 text-white font-bold text-base">
                    <Tv className="w-4 h-4 text-blue-400" />
                    <span>TV en Vivo</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({filteredChannels.length} canales)
                    </span>
                  </div>
                  {filteredChannels.length > visibleLiveLimit && (
                    <button
                      type="button"
                      onClick={() => setVisibleLiveLimit((prev) => prev + 30)}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Mostrar más canales
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredChannels.slice(0, visibleLiveLimit).map((channel) => (
                    <div
                      key={channel.stream_id}
                      data-nav="true"
                      tabIndex={0}
                      onClick={() => handlePlayChannel(channel)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handlePlayChannel(channel);
                      }}
                      className="group flex items-center justify-between p-3 rounded-2xl bg-surface border border-surfaceLight/60 hover:border-blue-500/80 cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-background border border-surfaceLight flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
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
                        </div>

                        <div className="overflow-hidden">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                            {channel.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 truncate block">
                            Canal en vivo
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayChannel(channel);
                        }}
                        className="p-2 rounded-xl bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0"
                        title="Reproducir canal"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* Sección 2: Películas */}
          {cleanQuery &&
            (activeFilter === 'all' || activeFilter === 'movies') &&
            filteredMovies.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-surfaceLight/60 pb-2">
                  <div className="flex items-center gap-2 text-white font-bold text-base">
                    <Film className="w-4 h-4 text-blue-400" />
                    <span>Películas</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({filteredMovies.length} películas)
                    </span>
                  </div>
                  {filteredMovies.length > visibleMoviesLimit && (
                    <button
                      type="button"
                      onClick={() => setVisibleMoviesLimit((prev) => prev + 30)}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Mostrar más películas
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {filteredMovies.slice(0, visibleMoviesLimit).map((movie) => (
                    <div
                      key={movie.stream_id}
                      data-nav="true"
                      tabIndex={0}
                      onClick={() => handleOpenMovieDetail(movie)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleOpenMovieDetail(movie);
                      }}
                      className="group relative bg-surface rounded-2xl overflow-hidden border border-surfaceLight/60 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:scale-[1.02]"
                    >
                      <div className="aspect-[2/3] w-full bg-background relative overflow-hidden">
                        {movie.stream_icon ? (
                          <img
                            src={movie.stream_icon}
                            alt={movie.name}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" fill="%231E293B"><rect width="100" height="150"/><text x="50%" y="50%" fill="%2364748B" font-size="12" text-anchor="middle">Sin Imagen</text></svg>';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Film className="w-8 h-8" />
                          </div>
                        )}

                        {Number(movie.rating_5based) > 0 && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[11px] font-bold text-amber-400 flex items-center gap-1 border border-white/10">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{Number(movie.rating_5based).toFixed(1)}</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 transform scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5">
                        <h4
                          className="text-xs sm:text-sm font-bold text-white truncate"
                          title={movie.name}
                        >
                          {movie.name}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* Sección 3: Series */}
          {cleanQuery &&
            (activeFilter === 'all' || activeFilter === 'series') &&
            filteredSeries.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-surfaceLight/60 pb-2">
                  <div className="flex items-center gap-2 text-white font-bold text-base">
                    <Clapperboard className="w-4 h-4 text-blue-400" />
                    <span>Series de TV</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({filteredSeries.length} series)
                    </span>
                  </div>
                  {filteredSeries.length > visibleSeriesLimit && (
                    <button
                      type="button"
                      onClick={() => setVisibleSeriesLimit((prev) => prev + 30)}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Mostrar más series
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {filteredSeries.slice(0, visibleSeriesLimit).map((series) => (
                    <div
                      key={series.series_id}
                      data-nav="true"
                      tabIndex={0}
                      onClick={() => handleOpenSeriesDetail(series)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleOpenSeriesDetail(series);
                      }}
                      className="group relative bg-surface rounded-2xl overflow-hidden border border-surfaceLight/60 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:scale-[1.02]"
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
                          <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 transform scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5">
                        <h4
                          className="text-xs sm:text-sm font-bold text-white truncate"
                          title={series.name}
                        >
                          {series.name}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
        </div>
      </div>

      {/* Modal Detalle Película */}
      {selectedMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-surface border border-surfaceLight rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <button
              onClick={() => {
                setSelectedMovie(null);
                setMovieDetail(null);
              }}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black text-white border border-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingMovieDetail ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-6 p-6">
                <div className="w-40 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden bg-background border border-surfaceLight flex-shrink-0 shadow-xl">
                  <img
                    src={selectedMovie.stream_icon}
                    alt={selectedMovie.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 space-y-3">
                  <h2 className="text-xl font-black text-white leading-tight">
                    {selectedMovie.name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    {movieDetail?.info?.releaseDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>{movieDetail.info.releaseDate}</span>
                      </div>
                    )}
                    {movieDetail?.info?.duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{movieDetail.info.duration}</span>
                      </div>
                    )}
                    {movieDetail?.info?.genre && (
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                        {movieDetail.info.genre}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto pr-2">
                    {movieDetail?.info?.plot ||
                      movieDetail?.info?.description ||
                      'Sinopsis no disponible para este contenido.'}
                  </p>

                  {movieDetail?.info?.cast && (
                    <div className="text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">Reparto: </span>
                      {movieDetail.info.cast}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      data-nav="true"
                      onClick={() => {
                        const m = selectedMovie;
                        setSelectedMovie(null);
                        handlePlayMovieDirect(m);
                      }}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/25"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Reproducir Ahora</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Detalle Serie & Selector de Episodios */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-surface border border-surfaceLight rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => {
                setSelectedSeries(null);
                setSeriesDetail(null);
              }}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black text-white border border-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingSeriesDetail ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {seriesDetail?.info?.plot || 'Sinopsis no disponible.'}
                    </p>
                  </div>
                </div>

                {/* Selector de Temporadas */}
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
                      currentEpisodes.map((ep) => (
                        <div
                          key={ep.id}
                          data-nav="true"
                          tabIndex={0}
                          onClick={() => handlePlayEpisode(selectedSeries, ep)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePlayEpisode(selectedSeries, ep);
                          }}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-background border border-surfaceLight hover:border-blue-500/80 cursor-pointer transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              {ep.episode_num}
                            </div>
                            <div className="overflow-hidden">
                              <h5 className="text-xs sm:text-sm font-bold text-white truncate">
                                {ep.title || `Episodio ${ep.episode_num}`}
                              </h5>
                              {ep.info?.duration && (
                                <span className="text-[11px] text-slate-400">{ep.info.duration}</span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="p-2 rounded-xl bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0"
                            title="Reproducir episodio"
                          >
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </button>
                        </div>
                      ))
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
