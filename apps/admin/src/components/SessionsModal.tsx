import React, { useEffect, useState } from 'react';
import { X, Tv, RefreshCw, Power } from 'lucide-react';
import { User, ActiveSession } from '../types';
import { adminApi } from '../services/adminApi';

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSessionsTerminated?: () => void;
}

export const SessionsModal: React.FC<SessionsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSessionsTerminated,
}) => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getUserSessions(user.id);
      setSessions(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar sesiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchSessions();
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleTerminateAll = async () => {
    if (!confirm(`¿Estás seguro de desconectar todas las pantallas de "${user.username}"?`)) return;
    setTerminating(true);
    try {
      await adminApi.terminateUserSessions(user.id);
      setSessions([]);
      if (onSessionsTerminated) onSessionsTerminated();
    } catch (err: any) {
      setError(err.message || 'Error al cerrar sesiones');
    } finally {
      setTerminating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-surfaceLight rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-surfaceLight flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">
              Pantallas en Vivo: {user.username}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surfaceLight transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Límite contratado: <strong className="text-white">{user.max_connections} pantalla(s)</strong>
            </span>
            <button
              onClick={fetchSessions}
              disabled={loading}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>

          <div className="space-y-2">
            {sessions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs bg-background/50 rounded-xl border border-surfaceLight">
                No hay dispositivos transmitiendo actualmente en esta cuenta.
              </div>
            ) : (
              sessions.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-background border border-surfaceLight flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                      <Tv className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{s.device_name || 'Dispositivo Desconocido'}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        IP: {s.ip_address} | ID: {s.device_id.slice(0, 10)}...
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      En vivo
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {sessions.length > 0 && (
            <div className="pt-3 border-t border-surfaceLight flex justify-end">
              <button
                onClick={handleTerminateAll}
                disabled={terminating}
                className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{terminating ? 'Desconectando...' : 'Cerrar Todas las Pantallas'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
