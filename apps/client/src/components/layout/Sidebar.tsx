import React from 'react';
import { Tv, Film, Clapperboard, Star, Search, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { VhsLogo } from '../common/VhsLogo';
import { ClientSession } from '../../types';

export type TabType = 'live' | 'movies' | 'series' | 'favorites' | 'search' | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  session: ClientSession;
  onLogout: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  session,
  onLogout,
  collapsed,
  setCollapsed,
}) => {
  const navItems = [
    { id: 'live', label: 'TV en Vivo', icon: Tv },
    { id: 'movies', label: 'Películas', icon: Film },
    { id: 'series', label: 'Series', icon: Clapperboard },
    { id: 'favorites', label: 'Favoritos', icon: Star },
    { id: 'search', label: 'Búsqueda Global', icon: Search },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ] as const;

  return (
    <aside
      className={`h-screen bg-surface border-r border-surfaceLight/80 flex flex-col justify-between transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-surfaceLight/60">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center flex-shrink-0 drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]">
              <VhsLogo width={collapsed ? 40 : 44} />
            </div>
            {!collapsed && (
              <span className="text-xl font-black tracking-tight text-white">
                goro<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] to-[#7B2FBE]">TV</span>
              </span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surfaceLight transition-colors"
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                data-nav="true"
                data-nav-col="menu"
                data-nav-active={isActive ? 'true' : undefined}
                tabIndex={0}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:scale-[1.03] ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-surfaceLight/50'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Account Info & Logout */}
      <div className="p-3 border-t border-surfaceLight/60">
        {!collapsed && session.serviceUser && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-background/60 border border-surfaceLight/40 text-xs">
            <div className="text-slate-400">Usuario</div>
            <div className="font-bold text-white truncate">{session.serviceUser.username}</div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Vigencia:</span>
              <span className="font-bold text-emerald-400">
                {session.serviceUser.daysRemaining} días
              </span>
            </div>
          </div>
        )}

        <button
          data-nav="true"
          tabIndex={0}
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Cerrar Sesión"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
};
