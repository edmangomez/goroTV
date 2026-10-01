import React, { useState } from 'react';
import { Plus, Server, CheckCircle2, XCircle, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { Provider } from '../types';

interface ProvidersTableProps {
  providers: Provider[];
  onOpenCreate: () => void;
  onOpenEdit: (provider: Provider) => void;
  onDelete: (id: number, name: string) => void;
  onTest: (id: number) => Promise<{ success: boolean; message: string; providerExpiry?: string; activeCons?: number; maxCons?: number }>;
}

export const ProvidersTable: React.FC<ProvidersTableProps> = ({
  providers,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  onTest,
}) => {
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<{ [id: number]: { success: boolean; message: string; expiry?: string; cons?: string } }>({});

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const res = await onTest(id);
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          success: res.success,
          message: res.message,
          expiry: res.providerExpiry,
          cons: res.activeCons !== undefined ? `${res.activeCons}/${res.maxCons}` : undefined,
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: false, message: err.message || 'Error de conexión' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-surfaceLight/80 overflow-hidden shadow-xl">
      <div className="p-4 sm:p-6 border-b border-surfaceLight flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Proveedores IPTV Xtream Codes
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surfaceLight text-slate-300">
              {providers.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registra los servidores maestros de tus proveedores para asignarlos a tus clientes.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Proveedor</span>
        </button>
      </div>

      {/* --- DESKTOP TABLE VIEW (Visible on >= md) --- */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-surfaceLight/60 bg-background/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4 sm:px-6">Proveedor</th>
              <th className="py-3 px-4">Servidor / Host</th>
              <th className="py-3 px-4">Usuario</th>
              <th className="py-3 px-4 text-center">Clientes</th>
              <th className="py-3 px-4">Prueba de Conexión</th>
              <th className="py-3 px-4 text-right sm:pr-6">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surfaceLight/40 text-sm">
            {providers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <Server className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  No hay proveedores registrados aún. Haz clic en "Nuevo Proveedor" para agregar uno.
                </td>
              </tr>
            ) : (
              providers.map((p) => {
                const result = testResults[p.id];
                const isTesting = testingId === p.id;

                return (
                  <tr key={p.id} className="hover:bg-surfaceLight/20 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="font-bold text-white">{p.name}</div>
                      {p.notes && <div className="text-xs text-slate-400">{p.notes}</div>}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-blue-400">
                      {p.host}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                      {p.username}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-surfaceLight text-slate-300">
                        {p.user_count || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {result ? (
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          )}
                          <div className="text-xs">
                            <span className={result.success ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                              {result.message}
                            </span>
                            {result.expiry && (
                              <div className="text-[11px] text-slate-400">
                                Vence: {new Date(result.expiry).toLocaleDateString()} {result.cons ? `| Cons: ${result.cons}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleTest(p.id)}
                          disabled={isTesting}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-surfaceLight/60 hover:bg-surfaceLight text-slate-300 border border-surfaceLight transition-all disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-blue-400' : ''}`} />
                          <span>{isTesting ? 'Probando...' : 'Probar Conexión'}</span>
                        </button>
                      )}
                    </td>

                    <td className="py-3.5 px-4 sm:pr-6 text-right space-x-1">
                      <button
                        onClick={() => onOpenEdit(p)}
                        className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Editar proveedor"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(p.id, p.name)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar proveedor"
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
        {providers.length === 0 ? (
          <div className="py-10 text-center text-slate-500 bg-background/30 rounded-xl border border-surfaceLight/40">
            <Server className="w-7 h-7 mx-auto mb-2 text-slate-600" />
            <p className="text-xs">No hay proveedores registrados aún.</p>
          </div>
        ) : (
          providers.map((p) => {
            const result = testResults[p.id];
            const isTesting = testingId === p.id;

            return (
              <div
                key={p.id}
                className="bg-background/80 border border-surfaceLight/90 rounded-2xl p-4 space-y-3.5 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">{p.name}</h3>
                    {p.notes && <p className="text-xs text-slate-400 mt-0.5">{p.notes}</p>}
                  </div>

                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-surfaceLight text-slate-300 shrink-0">
                    {p.user_count || 0} clientes
                  </span>
                </div>

                {/* Host & User */}
                <div className="space-y-1.5 pt-1 border-t border-surfaceLight/50">
                  <div className="bg-surface/80 p-2.5 rounded-xl border border-surfaceLight/70 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Servidor:</span>
                      <span className="font-mono text-blue-400 truncate max-w-[220px]">{p.host}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Usuario Xtream:</span>
                      <span className="font-mono text-slate-300">{p.username}</span>
                    </div>
                  </div>
                </div>

                {/* Test Result or Test Button */}
                <div className="pt-1">
                  {result ? (
                    <div className="p-2.5 rounded-xl bg-surface/80 border border-surfaceLight/70 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <div className="text-xs">
                          <span className={result.success ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                            {result.message}
                          </span>
                          {result.expiry && (
                            <div className="text-[10px] text-slate-400">
                              Vence: {new Date(result.expiry).toLocaleDateString()} {result.cons ? `| Cons: ${result.cons}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleTest(p.id)}
                        disabled={isTesting}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Reintentar prueba"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-blue-400' : ''}`} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTest(p.id)}
                      disabled={isTesting}
                      className="w-full py-2 px-3 rounded-xl bg-surfaceLight/60 hover:bg-surfaceLight active:bg-surfaceLight/80 text-slate-300 border border-surfaceLight text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-blue-400' : ''}`} />
                      <span>{isTesting ? 'Probando conexión...' : 'Probar Conexión'}</span>
                    </button>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-2 pt-2 border-t border-surfaceLight/50">
                  <button
                    onClick={() => onOpenEdit(p)}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-500/10 active:bg-blue-500/25 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Proveedor</span>
                  </button>

                  <button
                    onClick={() => onDelete(p.id, p.name)}
                    className="p-2 rounded-xl bg-red-500/10 active:bg-red-500/25 hover:bg-red-500/20 text-red-400 border border-red-500/25 flex items-center justify-center active:scale-95 transition-all"
                    title="Eliminar proveedor"
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
