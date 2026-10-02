import React, { useState, useEffect, useCallback } from 'react';
import { Tv, Lock, User, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { VhsLogo } from './components/common/VhsLogo';
import { adminApi } from './services/adminApi';
import { Admin, DashboardStats, Provider, User as ClientUser } from './types';
import { Navbar } from './components/Navbar';
import { StatsCards } from './components/StatsCards';
import { UsersTable } from './components/UsersTable';
import { ProvidersTable } from './components/ProvidersTable';
import { UserModal } from './components/UserModal';
import { ProviderModal } from './components/ProviderModal';
import { RenewModal } from './components/RenewModal';
import { SessionsModal } from './components/SessionsModal';
import { AdminSecurityModal } from './components/AdminSecurityModal';

export const App: React.FC = () => {
  // Auth state
  const [admin, setAdmin] = useState<Admin | null>(() => {
    const saved = localStorage.getItem('gorotv_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // App data state
  const [activeTab, setActiveTab] = useState<'users' | 'providers'>('users');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    expiredUsers: 0,
    expiringSoonUsers: 0,
    activeSessions: 0,
    totalProviders: 0,
  });
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ClientUser | null>(null);

  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewingUser, setRenewingUser] = useState<ClientUser | null>(null);

  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [inspectingUser, setInspectingUser] = useState<ClientUser | null>(null);

  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  // Handle logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem('gorotv_admin_token');
    localStorage.removeItem('gorotv_admin_user');
    setAdmin(null);
  }, []);

  useEffect(() => {
    const onLogoutEvent = () => handleLogout();
    window.addEventListener('gorotv_admin_logout', onLogoutEvent);
    return () => window.removeEventListener('gorotv_admin_logout', onLogoutEvent);
  }, [handleLogout]);

  // Load all dashboard data
  const loadData = useCallback(async () => {
    if (!admin) return;
    try {
      const [dashStats, usersList, providersList] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getUsers(),
        adminApi.getProviders(),
      ]);
      setStats(dashStats);
      setUsers(usersList);
      setProviders(providersList);
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
    }
  }, [admin]);

  const isModalOpenRef = React.useRef(false);
  isModalOpenRef.current = !!(userModalOpen || providerModalOpen || renewModalOpen || sessionsModalOpen || securityModalOpen);

  useEffect(() => {
    if (admin) {
      setLoading(true);
      loadData().finally(() => setLoading(false));

      // Auto-refresco de métricas cada 15 segundos (se pausa si hay modales de edición abiertos)
      const interval = setInterval(() => {
        if (!isModalOpenRef.current) {
          loadData();
        }
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [admin, loadData]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await adminApi.login(loginUser.trim(), loginPass.trim());
      localStorage.setItem('gorotv_admin_token', res.token);
      localStorage.setItem('gorotv_admin_user', JSON.stringify(res.admin));
      setAdmin(res.admin);
    } catch (err: any) {
      setLoginError(err.message || 'Error de credenciales');
    } finally {
      setLoginLoading(false);
    }
  };

  // User actions
  const handleSaveUser = async (data: any) => {
    if (editingUser) {
      await adminApi.updateUser(editingUser.id, data);
    } else {
      await adminApi.createUser(data);
    }
    await loadData();
  };

  const handleToggleStatus = async (userId: number) => {
    try {
      await adminApi.toggleUserStatus(userId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`¿Eliminar definitivamente al cliente "${username}"?`)) return;
    try {
      await adminApi.deleteUser(userId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar cliente');
    }
  };

  const handleRenewUser = async (userId: number, days?: number, customDate?: string) => {
    await adminApi.renewUser(userId, days, customDate);
    await loadData();
  };

  // Provider actions
  const handleSaveProvider = async (data: any) => {
    if (editingProvider) {
      await adminApi.updateProvider(editingProvider.id, data);
    } else {
      await adminApi.createProvider(data);
    }
    await loadData();
  };

  const handleDeleteProvider = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar proveedor "${name}"?`)) return;
    try {
      await adminApi.deleteProvider(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar proveedor');
    }
  };

  // --- RENDER LOGIN SI NO ESTÁ AUTENTICADO ---
  if (!admin) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="flex justify-center mb-3 drop-shadow-[0_0_15px_rgba(0,212,255,0.4)]">
            <VhsLogo width={120} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            goro<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] to-[#7B2FBE]">TV</span>
            <span className="ml-2 text-xs uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 text-[#00D4FF] border border-[#00D4FF]/30 align-middle">
              Admin
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Panel Administrativo & Gestión de Suscripciones
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-surface py-8 px-6 sm:px-10 rounded-3xl border border-surfaceLight/80 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-5">
              {loginError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Usuario Administrador
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    className="w-full bg-background border border-surfaceLight rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="admin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="w-full bg-background border border-surfaceLight rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
              >
                <span>{loginLoading ? 'Iniciando sesión...' : 'Entrar al Panel'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-surfaceLight text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span>Acceso restringido para personal autorizado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER DASHBOARD PRINCIPAL ---
  return (
    <div className="min-h-screen bg-background text-[#F8FAFC]">
      <Navbar
        admin={admin}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenSecurity={() => setSecurityModalOpen(true)}
        activeSessionsCount={stats.activeSessions}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Metric Cards */}
        <StatsCards stats={stats} />

        {/* Tab Content */}
        {activeTab === 'users' ? (
          <UsersTable
            users={users}
            onOpenCreate={() => {
              setEditingUser(null);
              setUserModalOpen(true);
            }}
            onOpenEdit={(user) => {
              setEditingUser(user);
              setUserModalOpen(true);
            }}
            onOpenRenew={(user) => {
              setRenewingUser(user);
              setRenewModalOpen(true);
            }}
            onOpenSessions={(user) => {
              setInspectingUser(user);
              setSessionsModalOpen(true);
            }}
            onToggleStatus={handleToggleStatus}
            onDeleteUser={handleDeleteUser}
          />
        ) : (
          <ProvidersTable
            providers={providers}
            onOpenCreate={() => {
              setEditingProvider(null);
              setProviderModalOpen(true);
            }}
            onOpenEdit={(p) => {
              setEditingProvider(p);
              setProviderModalOpen(true);
            }}
            onDelete={handleDeleteProvider}
            onTest={(id) => adminApi.testProvider(id)}
          />
        )}
      </main>

      {/* Modals */}
      <UserModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        onSubmit={handleSaveUser}
        providers={providers}
        initialUser={editingUser}
      />

      <ProviderModal
        isOpen={providerModalOpen}
        onClose={() => setProviderModalOpen(false)}
        onSubmit={handleSaveProvider}
        initialProvider={editingProvider}
      />

      <RenewModal
        isOpen={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        user={renewingUser}
        onRenew={handleRenewUser}
      />

      <SessionsModal
        isOpen={sessionsModalOpen}
        onClose={() => setSessionsModalOpen(false)}
        user={inspectingUser}
        onSessionsTerminated={loadData}
      />

      <AdminSecurityModal
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
        currentAdmin={admin}
        onAdminUpdated={(updated) => setAdmin(updated)}
      />
    </div>
  );
};
