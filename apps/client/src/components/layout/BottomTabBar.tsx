import React from 'react';
import { Tv, Film, Clapperboard, Star, Search, Settings } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: 'live' | 'movies' | 'series' | 'favorites' | 'search' | 'settings';
  setActiveTab: (tab: 'live' | 'movies' | 'series' | 'favorites' | 'search' | 'settings') => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'live', label: 'En Vivo', icon: Tv },
    { id: 'movies', label: 'Películas', icon: Film },
    { id: 'series', label: 'Series', icon: Clapperboard },
    { id: 'favorites', label: 'Favoritos', icon: Star },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-surfaceLight/80 pb-safe">
      <div className="grid grid-cols-6 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-blue-500/10' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
