import React, { useState, useEffect, useRef } from 'react';
import { Film, Star, Play, X, Clock, Calendar, Loader2, Search, Layers } from 'lucide-react';
import { Category, Movie, MovieDetailInfo, ClientSession } from '../types';
import { XtreamApiClient } from '../services/xtreamApi';
import { FavoriteCategoryItem, localDB } from '../services/db';
import { VideoPlayer } from '../components/player/VideoPlayer';

interface MoviesViewProps {
  session: ClientSession;
  searchQuery: string;
}

export const MoviesView: React.FC<MoviesViewProps> = ({ session, searchQuery }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [favCategories, setFavCategories] = useState<FavoriteCategoryItem[]>([]);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [mobileCatModalOpen, setMobileCatModalOpen] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieDetail, setMovieDetail] = useState<MovieDetailInfo | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [playingMovie, setPlayingMovie] = useState<{
    movie: Movie;
    url: string;
    fallbackUrls?: string[];
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
          xtream.getVodCategories(),
          localDB.getFavorites('movie'),
          localDB.getFavoriteCategories('movie'),
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
        console.error('Error al cargar VOD:', err);
      } finally {
        if (isMounted) setLoadingCats(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Cargar películas cuando cambia la categoría seleccionada (carga bajo demanda por categoría)
  useEffect(() => {
    if (!selectedCatId) return;
    let isMounted = true;
    async function fetchMovies() {
      setLoadingMovies(true);
      try {
        const list = await xtream.getVodStreams(selectedCatId);
        if (!isMounted) return;
        setMovies(list);
        setVisibleCount(30);
      } catch (err) {
        console.error('Error al cargar películas:', err);
      } finally {
        if (isMounted) setLoadingMovies(false);
      }
    }
    fetchMovies();
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
    const favId = `movie_${catId}`;
    if (isCatFav(catId)) {
      await localDB.removeFavoriteCategory(favId);
      setFavCategories((prev) => prev.filter((fc) => fc.categoryId !== catId));
    } else {
      await localDB.addFavoriteCategory('movie', catId, catName);
      const updated = await localDB.getFavoriteCategories('movie');
      setFavCategories(updated);
    }
  };

  // Filtrado de categorías por el buscador de categorías
  const filteredCategories = categories.filter((c) =>
    c.category_name.toLowerCase().includes(catSearchQuery.toLowerCase())
  );

  const filteredFavCategories = favCategories.filter((fc) =>
    fc.name.toLowerCase().includes(catSearchQuery.toLowerCase())
  );

  // Filtrado de películas por el buscador global
  const filteredMovies = movies.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Límite de películas según scroll infinito
  const displayedMovies = filteredMovies.slice(0, visibleCount);

  // Observer para scroll infinito en lotes de 30
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => {
            if (prev < filteredMovies.length) {
              return Math.min(prev + 30, filteredMovies.length);
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
  }, [filteredMovies.length, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 300) {
      if (visibleCount < filteredMovies.length) {
        setVisibleCount((prev) => Math.min(prev + 30, filteredMovies.length));
      }
    }
  };

  const handleOpenDetail = async (movie: Movie) => {
    setSelectedMovie(movie);
    setLoadingDetail(true);
    try {
      const info = await xtream.getVodInfo(movie.stream_id);
      setMovieDetail(info);
    } catch (err) {
      console.error('Error al cargar detalle:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePlayMovie = (movie: Movie) => {
    const ext = movie.container_extension || 'mp4';
    const directUrl = xtream.getMovieStreamUrl(movie.stream_id, ext);
    setPlayingMovie({
      movie,
      url: directUrl,
    });
  };

  const toggleFavorite = async (movie: Movie) => {
    const favId = `movie_${movie.stream_id}`;
    const isFav = !!favorites[movie.stream_id];

    if (isFav) {
      await localDB.removeFavorite(favId);
      setFavorites((prev) => ({ ...prev, [movie.stream_id]: false }));
    } else {
      await localDB.addFavorite({
        id: favId,
        type: 'movie',
        streamId: movie.stream_id,
        name: movie.name,
        icon: movie.stream_icon,
        category_id: movie.category_id,
      });
      setFavorites((prev) => ({ ...prev, [movie.stream_id]: true }));
    }
  };

  // Reproductor a pantalla completa para película
  if (playingMovie) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <VideoPlayer
          key={`movie-${playingMovie.movie.stream_id}`}
          streamUrl={playingMovie.url}
          title={playingMovie.movie.name}
          categoryName="Película VOD"
          isLive={false}
          onBack={() => setPlayingMovie(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full min-h-0 overflow-hidden">
      {/* Columna Lateral Izquierda: Categorías (Dual Desktop y Móvil) */}
      <div className="w-full lg:w-72 bg-surface/80 border-b lg:border-b-0 lg:border-r border-surfaceLight/60 flex flex-col flex-shrink-0 h-auto lg:h-full">
        {/* Cabecera y Buscador de Categorías */}
        <div className="p-3 border-b border-surfaceLight/60 space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Categorías Películas
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
                        data-nav="true"
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

          {/* Opción Todas las Películas */}
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
              <span>Todas las Películas</span>
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
                        data-nav="true"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-surfaceLight rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
              {/* Header Modal */}
              <div className="p-4 border-b border-surfaceLight flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Todas las Categorías de Películas</h3>
                </div>
                <button
                  type="button"
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
                  Todas las Películas
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

      {/* Grid de Películas con Scroll Infinito */}
      <div
        className="flex-1 p-4 sm:p-6 overflow-y-auto h-full focus:outline-none"
        onScroll={handleScroll}
      >
        {loadingMovies ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
            <span className="text-xs font-medium">Cargando películas de la categoría...</span>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
            No se encontraron películas en esta categoría.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
              {displayedMovies.map((movie) => {
                return (
                  <div
                    key={movie.stream_id}
                    data-nav="true"
                    tabIndex={0}
                    onClick={() => handleOpenDetail(movie)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleOpenDetail(movie);
                    }}
                    className="group relative bg-surface rounded-2xl overflow-hidden border border-surfaceLight/60 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:scale-[1.03]"
                  >
                    {/* Poster Image */}
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

                      {/* Rating Badge */}
                      {Number(movie.rating_5based) > 0 && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[11px] font-bold text-amber-400 flex items-center gap-1 border border-white/10">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{Number(movie.rating_5based).toFixed(1)}</span>
                        </div>
                      )}

                      {/* Play Overlay Button */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 transform scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="text-xs sm:text-sm font-bold text-white truncate" title={movie.name}>
                        {movie.name}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Elemento centinela para scroll infinito */}
            <div ref={sentinelRef} className="h-6 w-full flex items-center justify-center mt-4">
              {visibleCount < filteredMovies.length && (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span>Cargando más películas ({visibleCount} de {filteredMovies.length})...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal de Detalle de Película */}
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

            {loadingDetail ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div>
                <div className="flex flex-col sm:flex-row gap-6 p-6">
                  {/* Poster */}
                  <div className="w-40 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden bg-background border border-surfaceLight flex-shrink-0 shadow-xl">
                    <img
                      src={selectedMovie.stream_icon}
                      alt={selectedMovie.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Metadata */}
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

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        data-nav="true"
                        onClick={() => {
                          const mov = selectedMovie;
                          setSelectedMovie(null);
                          handlePlayMovie(mov);
                        }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/25"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Reproducir</span>
                      </button>

                      <button
                        type="button"
                        data-nav="true"
                        onClick={() => toggleFavorite(selectedMovie)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          favorites[selectedMovie.stream_id]
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'bg-surfaceLight border-surfaceLight text-slate-300 hover:text-white'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${favorites[selectedMovie.stream_id] ? 'fill-current' : ''}`} />
                        <span>
                          {favorites[selectedMovie.stream_id] ? 'En Favoritos' : 'Favorito'}
                        </span>
                      </button>
                    </div>
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
