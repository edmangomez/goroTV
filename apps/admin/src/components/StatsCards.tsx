import React from 'react';
import { Users, UserCheck, Clock, UserX, Tv, Server } from 'lucide-react';
import { DashboardStats } from '../types';

interface StatsCardsProps {
  stats: DashboardStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Total Clientes',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Activos',
      value: stats.activeUsers,
      icon: UserCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Por Vencer (5d)',
      value: stats.expiringSoonUsers,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Vencidos',
      value: stats.expiredUsers,
      icon: UserX,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
    },
    {
      title: 'Pantallas en Vivo',
      value: stats.activeSessions,
      icon: Tv,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      title: 'Proveedores',
      value: stats.totalProviders,
      icon: Server,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4 mb-5 sm:mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${card.bg} bg-surface/50 backdrop-blur-sm flex flex-col justify-between transition-transform hover:-translate-y-0.5`}
          >
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-medium text-slate-400 truncate">{card.title}</span>
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${card.color} shrink-0`} />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">{card.value}</div>
          </div>
        );
      })}
    </div>
  );
};
