import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Search, Tv, Maximize, Minimize } from 'lucide-react';
import { ClientSession } from '../../types';
import { isFullscreenActive, toggleAppFullscreen, addFullscreenChangeListener } from '../../utils/fullscreen';

interface HeaderProps {
  title: string;
  session: ClientSession;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSearch?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  session,
  searchQuery,
  setSearchQuery,
  showSearch = true,
}) => {
  const [time, setTime] = useState<string>('');
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    setIsFs(isFullscreenActive());
    return addFullscreenChangeListener((active) => {
      setIsFs(active);
    });
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-surfaceLight/60 bg-surface/40 backdrop-blur-sm sticky top-0 z-20">
      {/* Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
          {title}
        </h1>
      </div>

      {/* Search Input */}
      {showSearch && (
        <div className="flex-1 max-w-xs sm:max-w-md mx-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-nav="true"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar canal, película o serie..."
              className="w-full bg-background/80 border border-surfaceLight rounded-xl pl-9 pr-4 py-1.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Right widgets: subscription & clock */}
      <div className="flex items-center gap-3">
        {session.serviceUser ? (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{session.serviceUser.daysRemaining} días</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Tv className="w-3.5 h-3.5" />
            <span>Xtream Directo</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surfaceLight/60 text-slate-300 text-xs font-mono font-bold">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>{time}</span>
        </div>

        {/* Botón Global de Pantalla Completa para toda la aplicación */}
        <button
          type="button"
          data-nav="true"
          onClick={() => toggleAppFullscreen(document.documentElement)}
          className="p-2 rounded-xl bg-surfaceLight/60 hover:bg-surfaceLight text-slate-300 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95"
          title={isFs ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {isFs ? <Minimize className="w-4 h-4 text-blue-400" /> : <Maximize className="w-4 h-4 text-slate-300" />}
        </button>
      </div>
    </header>
  );
};
