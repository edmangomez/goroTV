import React, { useState } from 'react';
import { Search, Plus, Calendar, Tv, Power, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import { User } from '../types';

interface UsersTableProps {
  users: User[];
  onOpenCreate: () => void;
  onOpenEdit: (user: User) => void;
  onOpenRenew: (user: User) => void;
  onOpenSessions: (user: User) => void;
  onToggleStatus: (userId: number) => void;
  onDeleteUser: (userId: number, username: string) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  users,
  onOpenCreate,
  onOpenEdit,
  onOpenRenew,
  onOpenSessions,
  onToggleStatus,
  onDeleteUser,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name && u.display_name.toLowerCase().includes(search.toLowerCase())) ||
      (u.phone && u.phone.includes(search));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return u.is_active === 1 && u.days_remaining > 5;
    if (statusFilter === 'expiring') return u.is_active === 1 && u.days_remaining >= 0 && u.days_remaining <= 5;
    if (statusFilter === 'expired') return u.days_remaining < 0 || u.is_active === 0;

    return true;
  });

  return (
    <div className="bg-surface rounded-2xl border border-surfaceLight/80 overflow-hidden shadow-xl">
      {/* Header & Controls */}
      <div className="p-4 sm:p-6 border-b border-surfaceLight flex flex-col gap-4">
        {/* Title and Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Gestión de Clientes & Suscripciones
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surfaceLight text-slate-300">
                {filteredUsers.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Crea usuarios para la app, asigna proveedores Xtream y define el tiempo de vigencia.
            </p>
          </div>

          <button
            onClick={onOpenCreate}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cliente por usuario o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-surfaceLight rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar rounded-xl bg-background border border-surfaceLight p-1 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'all' ? 'bg-surfaceLight text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setStatusFilter('expiring')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'expiring' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Por Vencer
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'expired' ? 'bg-red-500/20 text-red-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Vencidos
            </button>
          </div>
        </div>
      </div>

      {/* --- DESKTOP TABLE VIEW (Visible on >= md) --- */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-surfaceLight/60 bg-background/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4 sm:px-6">Cliente</th>
              <th className="py-3 px-4">Proveedor</th>
              <th className="py-3 px-4 text-center">Pantallas</th>
              <th className="py-3 px-4">Vencimiento / Días</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-4 text-right sm:pr-6">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surfaceLight/40 text-sm">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  No se encontraron clientes registrados con este criterio.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const isExpired = user.days_remaining <= 0 || new Date(user.expires_at).getTime() <= Date.now();
                const isExpiringSoon = !isExpired && user.days_remaining <= 5;

                return (
                  <tr key={user.id} className="hover:bg-surfaceLight/20 transition-colors">
                    {/* User info */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="font-bold text-white">{user.username}</div>
                      {user.display_name && (
                        <div className="text-xs text-slate-400">{user.display_name}</div>
                      )}
                      {user.phone && (
                        <div className="text-xs text-slate-500">{user.phone}</div>
                      )}
                    </td>

                    {/* Provider */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {user.provider_name || 'Sin Proveedor'}
                      </span>
                    </td>

                    {/* Screens */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onOpenSessions(user)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all hover:scale-105 bg-surfaceLight/60 text-slate-300 border border-surfaceLight"
                        title="Ver dispositivos conectados en vivo"
                      >
                        <Tv className={`w-3.5 h-3.5 ${user.active_screens > 0 ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span>
                          {user.active_screens} / {user.max_connections}
                        </span>
                      </button>
                    </td>

                    {/* Expiration */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-slate-300">
                        {new Date(user.expires_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div>
                        {user.is_active === 0 ? (
                          <span className="text-[11px] font-bold text-red-400">Suspendido</span>
                        ) : isExpired ? (
                          <span className="text-[11px] font-bold text-red-400">Vencido</span>
                        ) : isExpiringSoon ? (
                          <span className="text-[11px] font-bold text-amber-400">
                            Vence en {Math.max(1, Math.round(user.days_remaining))} día(s)
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-400">
                            {Math.round(user.days_remaining)} días restantes
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onToggleStatus(user.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                          user.is_active === 1
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                        }`}
                        title="Clic para cambiar estado"
                      >
                        <Power className="w-3 h-3" />
                        {user.is_active === 1 ? 'Activo' : 'Suspendido'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 sm:pr-6 text-right space-x-1">
                      <button
                        onClick={() => onOpenRenew(user)}
                        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        title="Renovar suscripción (+días)"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onOpenEdit(user)}
                        className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Editar datos del cliente"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteUser(user.id, user.username)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- MOBILE CARDS VIEW (Visible on < md) --- */}
      <div className="block md:hidden p-3 space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="py-10 text-center text-slate-500 bg-background/30 rounded-xl border border-surfaceLight/40">
            <ShieldAlert className="w-7 h-7 mx-auto mb-2 text-slate-600" />
            <p className="text-xs">No se encontraron clientes registrados.</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isExpired = user.days_remaining <= 0 || new Date(user.expires_at).getTime() <= Date.now();
            const isExpiringSoon = !isExpired && user.days_remaining <= 5;

            return (
              <div
                key={user.id}
                className="bg-background/80 border border-surfaceLight/90 rounded-2xl p-4 space-y-3.5 shadow-sm"
              >
                {/* User Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">{user.username}</h3>
                    {user.display_name && (
                      <p className="text-xs text-slate-300 font-medium mt-0.5">{user.display_name}</p>
                    )}
                    {user.phone && (
                      <p className="text-[11px] text-slate-400">{user.phone}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {/* Status Power button */}
                    <button
                      onClick={() => onToggleStatus(user.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                        user.is_active === 1
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {user.is_active === 1 ? 'Activo' : 'Suspendido'}
                    </button>

                    {/* Provider badge */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 max-w-[130px] truncate">
                      {user.provider_name || 'Sin Proveedor'}
                    </span>
                  </div>
                </div>

                {/* Metrics: Screens & Expiration */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-surfaceLight/50">
                  {/* Screens button */}
                  <button
                    onClick={() => onOpenSessions(user)}
                    className="p-2 rounded-xl bg-surface/80 border border-surfaceLight/70 flex flex-col items-start text-left active:bg-surfaceLight/40 transition-colors"
                  >
                    <span className="text-[10px] text-slate-400 font-medium">Pantallas en vivo</span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs font-bold text-white">
                      <Tv className={`w-3.5 h-3.5 ${user.active_screens > 0 ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <span>{user.active_screens} / {user.max_connections}</span>
                    </div>
                  </button>

                  {/* Expiration badge */}
                  <div className="p-2 rounded-xl bg-surface/80 border border-surfaceLight/70 flex flex-col items-start">
                    <span className="text-[10px] text-slate-400 font-medium">Vencimiento</span>
                    <div className="mt-0.5">
                      <span className="text-xs font-semibold text-slate-200">
                        {new Date(user.expires_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div>
                      {user.is_active === 0 ? (
                        <span className="text-[10px] font-bold text-red-400">Suspendido</span>
                      ) : isExpired ? (
                        <span className="text-[10px] font-bold text-red-400">Vencido</span>
                      ) : isExpiringSoon ? (
                        <span className="text-[10px] font-bold text-amber-400">
                          Vence en {Math.max(1, Math.round(user.days_remaining))}d
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400">
                          {Math.round(user.days_remaining)} días restantes
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Touch Actions Toolbar */}
                <div className="flex items-center gap-2 pt-2 border-t border-surfaceLight/50">
                  <button
                    onClick={() => onOpenRenew(user)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 active:bg-emerald-500/25 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Renovar</span>
                  </button>

                  <button
                    onClick={() => onOpenEdit(user)}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-500/10 active:bg-blue-500/25 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => onDeleteUser(user.id, user.username)}
                    className="p-2 rounded-xl bg-red-500/10 active:bg-red-500/25 hover:bg-red-500/20 text-red-400 border border-red-500/25 flex items-center justify-center active:scale-95 transition-all"
                    title="Eliminar cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
