import React, { useState } from 'react';
import { Tv, ShieldCheck, Server, User, Lock, ArrowRight, Globe } from 'lucide-react';
import { ClientSession } from '../types';
import { authApi } from '../services/authApi';
import { XtreamApiClient } from '../services/xtreamApi';

interface LoginViewProps {
  onLoginSuccess: (session: ClientSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'service' | 'xtream'>('service');

  // Formulario Cuenta de Servicio
  const [serviceUser, setServiceUser] = useState('');
  const [servicePass, setServicePass] = useState('');

  // Formulario Xtream Directo
  const [profileName, setProfileName] = useState('Mi Proveedor');
  const [xtreamHost, setXtreamHost] = useState('');
  const [xtreamUser, setXtreamUser] = useState('');
  const [xtreamPass, setXtreamPass] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleServiceLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await authApi.login(serviceUser.trim(), servicePass.trim());
      const session: ClientSession = {
        mode: 'service',
        token: data.token,
        serviceUser: data.user,
        provider: data.provider,
        profileName: data.user.displayName || data.user.username,
      };
      onLoginSuccess(session);
    } catch (err: any) {
      if (err.code === 'ACCOUNT_EXPIRED') {
        setError(`Tu suscripción ha vencido (${new Date(err.expiresAt).toLocaleDateString()}). Contacta a tu proveedor para renovar.`);
      } else if (err.code === 'ACCOUNT_SUSPENDED') {
        setError('Tu cuenta ha sido suspendida. Contacta a soporte.');
      } else {
        setError(err.message || 'Usuario o contraseña incorrectos');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleXtreamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const provider = {
        host: xtreamHost.trim(),
        username: xtreamUser.trim(),
        password: xtreamPass.trim(),
      };

      const client = new XtreamApiClient(provider);
      await client.authenticate();

      const session: ClientSession = {
        mode: 'xtream_direct',
        provider,
        profileName: profileName.trim() || 'Proveedor Xtream',
      };
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'No se pudo conectar al servidor Xtream. Verifica la URL y las credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/25 mb-4">
          <Tv className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          goro<span className="text-blue-500">TV</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Tu plataforma multiplataforma de televisión y streaming
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-7 px-5 sm:px-8 rounded-3xl border border-surfaceLight/80 shadow-2xl">
          {/* Tabs Selector */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-background border border-surfaceLight mb-6">
            <button
              type="button"
              data-nav="true"
              onClick={() => {
                setActiveTab('service');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'service'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Cuenta goroTV</span>
            </button>

            <button
              type="button"
              data-nav="true"
              onClick={() => {
                setActiveTab('xtream');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'xtream'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Xtream Directo</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}

          {/* Formulario Opción 1: Cuenta de Servicio */}
          {activeTab === 'service' ? (
            <form onSubmit={handleServiceLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Usuario</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    data-nav="true"
                    value={serviceUser}
                    onChange={(e) => setServiceUser(e.target.value)}
                    placeholder="Tu usuario asignado"
                    className="w-full bg-background border border-surfaceLight rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    data-nav="true"
                    value={servicePass}
                    onChange={(e) => setServicePass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-background border border-surfaceLight rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  data-nav="true"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/25"
                >
                  <span>{loading ? 'Validando suscripción...' : 'Iniciar Sesión'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-500 pt-2">
                Ingresa las credenciales proporcionadas por tu administrador.
              </p>
            </form>
          ) : (
            /* Formulario Opción 2: Xtream Directo */
            <form onSubmit={handleXtreamLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Lista</label>
                <input
                  type="text"
                  data-nav="true"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="ej: Mi Proveedor IPTV"
                  className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">URL del Servidor</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    data-nav="true"
                    value={xtreamHost}
                    onChange={(e) => setXtreamHost(e.target.value)}
                    placeholder="http://servidor.xyz:8080"
                    className="w-full bg-background border border-surfaceLight rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Usuario</label>
                  <input
                    type="text"
                    required
                    data-nav="true"
                    value={xtreamUser}
                    onChange={(e) => setXtreamUser(e.target.value)}
                    placeholder="usuario"
                    className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    data-nav="true"
                    value={xtreamPass}
                    onChange={(e) => setXtreamPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-background border border-surfaceLight rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  data-nav="true"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/25"
                >
                  <span>{loading ? 'Conectando con Xtream...' : 'Conectar Servidor'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
