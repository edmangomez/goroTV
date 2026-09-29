import React from 'react';
import { Tv, AlertTriangle, LogOut } from 'lucide-react';

interface SessionLimitModalProps {
  isOpen: boolean;
  maxAllowed: number;
  onLogout: () => void;
  onRetry: () => void;
}

export const SessionLimitModal: React.FC<SessionLimitModalProps> = ({
  isOpen,
  maxAllowed,
  onLogout,
  onRetry,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-surfaceLight rounded-3xl w-full max-w-md p-6 text-center shadow-2xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-black text-white">Límite de Pantallas Alcanzado</h3>

        <p className="text-xs text-slate-300 leading-relaxed">
          Tu cuenta permite un máximo de <strong className="text-white">{maxAllowed} pantalla(s)</strong> simultánea(s) y actualmente se encuentra en uso en otros dispositivos.
        </p>

        <p className="text-[11px] text-slate-400">
          Cierra la reproducción en otro dispositivo para poder ver contenido en esta pantalla.
        </p>

        <div className="pt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            data-nav="true"
            onClick={onRetry}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            Reintentar Conexión
          </button>

          <button
            type="button"
            data-nav="true"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surfaceLight text-slate-300 hover:text-white text-xs font-bold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
