import React from 'react';
import { Tv, Users, Server, LogOut, Activity, Key } from 'lucide-react';
import { Admin } from '../types';

interface NavbarProps {
  admin: Admin;
  activeTab: 'users' | 'providers';
  setActiveTab: (tab: 'users' | 'providers') => void;
  onLogout: () => void;
  onOpenSecurity: () => void;
  activeSessionsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  admin,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenSecurity,
  activeSessionsCount,
}) => {
  return (
    <header className="bg-surface/95 border-b border-surfaceLight/80 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main top bar */}
        <div className="h-16 flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                goro<span className="text-blue-500">TV</span>
                <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Admin
                </span>
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile, shown on md+) */}
          <nav className="hidden md:flex items-center gap-1 bg-background/60 p-1 rounded-xl border border-surfaceLight/60">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-surfaceLight/40'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Clientes & Tiempo</span>
            </button>

            <button
              onClick={() => setActiveTab('providers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'providers'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-surfaceLight/40'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Proveedores Xtream</span>
            </button>
          </nav>

          {/* Right side info & actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live sessions badge */}
            <div
              title={`${activeSessionsCount} pantalla(s) conectadas en vivo`}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold"
            >
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span className="inline md:hidden">{activeSessionsCount}</span>
              <span className="hidden md:inline">{activeSessionsCount} en vivo</span>
            </div>

            {/* Security modal button */}
            <button
              onClick={onOpenSecurity}
              title="Seguridad y Administradores"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-background border border-surfaceLight hover:border-blue-500/50 transition-all shadow-sm"
            >
              <Key className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Seguridad</span>
            </button>

            {/* Logout button */}
            <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:border-l sm:border-surfaceLight">
              <div className="text-right hidden xl:block">
                <p className="text-xs text-slate-400">Conectado como</p>
                <p className="text-sm font-semibold text-white">{admin.username}</p>
              </div>
              <button
                onClick={onLogout}
                title="Cerrar Sesión"
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Segmented Navigation Tabs (Shown on < md only) */}
        <div className="md:hidden pb-3">
          <nav className="grid grid-cols-2 gap-1.5 bg-background/80 p-1 rounded-xl border border-surfaceLight/70">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-surfaceLight/30'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="truncate">Clientes & Tiempo</span>
            </button>

            <button
              onClick={() => setActiveTab('providers')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'providers'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-surfaceLight/30'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span className="truncate">Proveedores Xtream</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
