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
    <header className="bg-surface border-b border-surfaceLight/80 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              goro<span className="text-blue-500">TV</span>
              <span className="text-xs uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Admin
              </span>
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-background/60 p-1 rounded-xl border border-surfaceLight/60">
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

        {/* Right side info & logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>{activeSessionsCount} pantalla(s) en vivo</span>
          </div>

          <button
            onClick={onOpenSecurity}
            title="Seguridad y Administradores"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-background border border-surfaceLight hover:border-blue-500/50 transition-all shadow-sm"
          >
            <Key className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Seguridad & Admins</span>
          </button>

          <div className="flex items-center gap-3 pl-1 border-l border-surfaceLight">
            <div className="text-right hidden xl:block">
              <p className="text-xs text-slate-400">Conectado como</p>
              <p className="text-sm font-semibold text-white">{admin.username}</p>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar Sesión"
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
