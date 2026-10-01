import React, { useState, useEffect } from 'react';
import { X, Server, Save } from 'lucide-react';
import { Provider } from '../types';

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialProvider?: Provider | null;
}

export const ProviderModal: React.FC<ProviderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialProvider,
}) => {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProvider) {
      setName(initialProvider.name);
      setHost(initialProvider.host);
      setUsername(initialProvider.username);
      setPassword('');
      setNotes(initialProvider.notes || '');
    } else {
      setName('');
      setHost('');
      setUsername('');
      setPassword('');
      setNotes('');
    }
    setError(null);
  }, [initialProvider, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !host.trim() || !username.trim()) {
      setError('Nombre, URL de servidor y usuario son obligatorios');
      return;
    }

    if (!initialProvider && !password.trim()) {
      setError('La contraseña del proveedor es obligatoria');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        host: host.trim(),
        username: username.trim(),
        password: password.trim() ? password.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar proveedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-surfaceLight rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-surfaceLight flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-white text-base">
              {initialProvider ? `Editar: ${initialProvider.name}` : 'Registrar Proveedor Xtream'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surfaceLight transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre de Referencia <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej: Servidor Principal 1"
              className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              URL / Host del Servidor <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="http://servidor.xyz:8080"
              className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Usuario <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="usuario"
                className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {initialProvider ? 'Nueva Clave (opcional)' : 'Contraseña *'}
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={initialProvider ? 'Dejar en blanco' : 'clave'}
                className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre paquetes contratados, contacto, etc."
              rows={2}
              className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

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
              <span>{loading ? 'Guardando...' : initialProvider ? 'Guardar Cambios' : 'Registrar Proveedor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
