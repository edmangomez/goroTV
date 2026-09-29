import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save } from 'lucide-react';
import { User, Provider } from '../types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  providers: Provider[];
  initialUser?: User | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  providers,
  initialUser,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [providerId, setProviderId] = useState<number>(providers[0]?.id || 0);
  const [maxConnections, setMaxConnections] = useState<number>(1);
  const [durationDays, setDurationDays] = useState<number>(30);
  const [customExpiry, setCustomExpiry] = useState<string>('');
  const [useCustomExpiry, setUseCustomExpiry] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialUser) {
      setUsername(initialUser.username);
      setPassword('');
      setProviderId(initialUser.provider_id);
      setMaxConnections(initialUser.max_connections || 1);
      setDisplayName(initialUser.display_name || '');
      setPhone(initialUser.phone || '');
      setNotes(initialUser.notes || '');
    } else {
      setUsername('');
      setPassword('');
      setProviderId(providers[0]?.id || 0);
      setMaxConnections(1);
      setDurationDays(30);
      setCustomExpiry('');
      setUseCustomExpiry(false);
      setDisplayName('');
      setPhone('');
      setNotes('');
    }
    setError(null);
  }, [initialUser, isOpen, providers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('El usuario es obligatorio');
      return;
    }

    if (!initialUser && !password.trim()) {
      setError('La contraseña es obligatoria');
      return;
    }

    if (!providerId) {
      setError('Debes seleccionar un proveedor Xtream');
      return;
    }

    setLoading(true);
    try {
      if (initialUser) {
        await onSubmit({
          password: password.trim() ? password.trim() : undefined,
          providerId,
          maxConnections,
          displayName: displayName.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await onSubmit({
          username: username.trim(),
          password: password.trim(),
          providerId,
          maxConnections,
          days: useCustomExpiry ? undefined : durationDays,
          customExpiryDate: useCustomExpiry && customExpiry ? new Date(customExpiry).toISOString() : undefined,
          displayName: displayName.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-surfaceLight rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surfaceLight flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-white text-base">
              {initialUser ? `Editar Cliente: ${initialUser.username}` : 'Crear Nuevo Cliente'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surfaceLight transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Usuario */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Usuario <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={username}
                disabled={!!initialUser}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej: cliente123"
                className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {initialUser ? 'Nueva Clave (opcional)' : 'Contraseña *'}
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={initialUser ? 'Dejar en blanco para no cambiar' : 'ej: ClaveSegura2026'}
                className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Proveedor Xtream */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Proveedor IPTV Asignado <span className="text-red-400">*</span>
            </label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(Number(e.target.value))}
              className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {providers.length === 0 ? (
                <option value={0}>Primero debes registrar un proveedor en la pestaña Proveedores</option>
              ) : (
                providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.host})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Pantallas simultáneas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Pantallas / Dispositivos Simultáneos
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxConnections(num)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    maxConnections === num
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-background text-slate-400 border-surfaceLight hover:border-slate-500 hover:text-white'
                  }`}
                >
                  {num} {num === 1 ? 'Pantalla' : 'Pantallas'}
                </button>
              ))}
            </div>
          </div>

          {/* Tiempo de vigencia (solo al crear) */}
          {!initialUser && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Vigencia de la Suscripción <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setUseCustomExpiry(!useCustomExpiry)}
                  className="text-[11px] text-blue-400 hover:underline"
                >
                  {useCustomExpiry ? 'Elegir por días' : 'Fecha exacta'}
                </button>
              </div>

              {!useCustomExpiry ? (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '1 Mes (30d)', days: 30 },
                    { label: '3 Meses (90d)', days: 90 },
                    { label: '6 Meses (180d)', days: 180 },
                    { label: '1 Año (365d)', days: 365 },
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setDurationDays(preset.days)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        durationDays === preset.days
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                          : 'bg-background text-slate-400 border-surfaceLight hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="date"
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              )}
            </div>
          )}

          {/* Datos de contacto opcionales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Real (opcional)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ej: Juan Pérez"
                className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono (opcional)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="ej: +52 55 1234 5678"
                className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notas Internas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles de pago, referencia, etc."
              rows={2}
              className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
            />
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
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : initialUser ? 'Guardar Cambios' : 'Crear Cliente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
