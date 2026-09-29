import React, { useState } from 'react';
import { X, Calendar, Check } from 'lucide-react';
import { User } from '../types';

interface RenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onRenew: (userId: number, days?: number, customDate?: string) => Promise<void>;
}

export const RenewModal: React.FC<RenewModalProps> = ({
  isOpen,
  onClose,
  user,
  onRenew,
}) => {
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [customDate, setCustomDate] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const currentExpiry = new Date(user.expires_at);
  const now = new Date();
  const baseDate = currentExpiry.getTime() > now.getTime() ? currentExpiry : now;

  let calculatedNewDate: Date;
  if (useCustom && customDate) {
    calculatedNewDate = new Date(customDate);
  } else {
    calculatedNewDate = new Date(baseDate.getTime() + selectedDays * 24 * 60 * 60 * 1000);
  }

  const handleRenew = async () => {
    setLoading(true);
    setError(null);
    try {
      if (useCustom) {
        if (!customDate) {
          setError('Selecciona una fecha');
          setLoading(false);
          return;
        }
        await onRenew(user.id, undefined, new Date(customDate).toISOString());
      } else {
        await onRenew(user.id, selectedDays);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al renovar suscripción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-surfaceLight rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-surfaceLight flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-white text-base">
              Renovar Suscripción: {user.username}
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

          {/* Current Expiry Info */}
          <div className="p-3.5 rounded-xl bg-background border border-surfaceLight flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block">Vencimiento actual:</span>
              <span className="font-semibold text-white">
                {currentExpiry.toLocaleDateString('es-ES', { dateStyle: 'long' })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">Estado:</span>
              <span className={user.days_remaining > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {user.days_remaining > 0 ? `${Math.round(user.days_remaining)} días restantes` : 'Expirado'}
              </span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Seleccionar Tiempo a Agregar
              </label>
              <button
                type="button"
                onClick={() => setUseCustom(!useCustom)}
                className="text-[11px] text-blue-400 hover:underline"
              >
                {useCustom ? 'Ver opciones rápidas' : 'Elegir fecha personalizada'}
              </button>
            </div>

            {!useCustom ? (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '+1 Mes (30 días)', days: 30 },
                  { label: '+3 Meses (90 días)', days: 90 },
                  { label: '+6 Meses (180 días)', days: 180 },
                  { label: '+1 Año (365 días)', days: 365 },
                ].map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => setSelectedDays(item.days)}
                    className={`py-3 px-3 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between ${
                      selectedDays === item.days
                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/60 shadow-md'
                        : 'bg-background text-slate-400 border-surfaceLight hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    {selectedDays === item.days && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            )}
          </div>

          {/* New Expiration Preview */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <span className="text-slate-400 block mb-0.5">Nuevo vencimiento calculado:</span>
            <span className="text-sm font-bold text-emerald-400">
              {calculatedNewDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-surfaceLight flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-surfaceLight transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRenew}
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
            >
              <Calendar className="w-4 h-4" />
              <span>{loading ? 'Aplicando...' : 'Confirmar Renovación'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
