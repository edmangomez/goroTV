import React from 'react';
import { CalendarX, LogOut } from 'lucide-react';

interface ExpiredModalProps {
  isOpen: boolean;
  expiresAt?: string;
  onLogout: () => void;
}

export const ExpiredModal: React.FC<ExpiredModalProps> = ({
  isOpen,
  expiresAt,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-red-500/30 rounded-3xl w-full max-w-md p-6 text-center shadow-2xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
          <CalendarX className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-black text-white">Suscripción Vencida</h3>

        <p className="text-xs text-slate-300 leading-relaxed">
          Tu acceso a goroTV ha expirado
          {expiresAt && ` el ${new Date(expiresAt).toLocaleDateString('es-ES', { dateStyle: 'long' })}`}.
        </p>

        <p className="text-xs text-amber-400/90 font-medium">
          Contacta a tu proveedor de servicio para renovar tu suscripción y continuar disfrutando del servicio.
        </p>

        <div className="pt-3 flex justify-center">
          <button
            type="button"
            data-nav="true"
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
