import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Key, UserPlus, Trash2, CheckCircle2, AlertCircle, Lock, User } from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { Admin } from '../types';

interface AdminSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAdmin: Admin;
  onAdminUpdated: (updatedAdmin: Admin) => void;
}

export const AdminSecurityModal: React.FC<AdminSecurityModalProps> = ({
  isOpen,
  onClose,
  currentAdmin,
  onAdminUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'admins'>('profile');

  // Tab 1: Mi Perfil & Contraseña
  const [newUsername, setNewUsername] = useState(currentAdmin.username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab 2: Lista y creación de Administradores
  const [adminsList, setAdminsList] = useState<{ id: number; username: string; created_at: string }[]>([]);
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [adminsMessage, setAdminsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewUsername(currentAdmin.username);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setProfileMessage(null);
      setAdminsMessage(null);
      loadAdmins();
    }
  }, [isOpen, currentAdmin]);

  const loadAdmins = async () => {
    setAdminsLoading(true);
    try {
      const data = await adminApi.getAdmins();
      setAdminsList(data);
    } catch (err: any) {
      console.error('Error al cargar administradores:', err);
    } finally {
      setAdminsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Manejar cambio de credenciales del admin actual
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    if (!currentPassword) {
      setProfileMessage({ type: 'error', text: 'Debes ingresar tu contraseña actual para confirmar los cambios.' });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setProfileMessage({ type: 'error', text: 'Las nuevas contraseñas no coinciden.' });
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setProfileMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setProfileLoading(true);
    try {
      const res = await adminApi.changeAdminPassword({
        currentPassword,
        newUsername: newUsername.trim() !== currentAdmin.username ? newUsername.trim() : undefined,
        newPassword: newPassword ? newPassword.trim() : undefined,
      });

      setProfileMessage({ type: 'success', text: res.message || 'Credenciales actualizadas exitosamente.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      const updated = { id: res.admin.id, username: res.admin.username };
      localStorage.setItem('gorotv_admin_user', JSON.stringify(updated));
      onAdminUpdated(updated);
      loadAdmins();
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Error al actualizar credenciales.' });
    } finally {
      setProfileLoading(false);
    }
  };

  // Manejar creación de un nuevo administrador
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminsMessage(null);

    if (!newAdminUser.trim() || !newAdminPass.trim()) {
      setAdminsMessage({ type: 'error', text: 'Usuario y contraseña son requeridos.' });
      return;
    }

    if (newAdminPass.trim().length < 6) {
      setAdminsMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setCreateAdminLoading(true);
    try {
      const res = await adminApi.createAdmin({
        username: newAdminUser.trim(),
        password: newAdminPass.trim(),
      });

      setAdminsMessage({ type: 'success', text: `¡Administrador "${res.username}" creado exitosamente!` });
      setNewAdminUser('');
      setNewAdminPass('');
      loadAdmins();
    } catch (err: any) {
      setAdminsMessage({ type: 'error', text: err.message || 'Error al crear administrador.' });
    } finally {
      setCreateAdminLoading(false);
    }
  };

  // Manejar eliminación de un administrador
  const handleDeleteAdmin = async (id: number, username: string) => {
    if (!confirm(`¿Eliminar la cuenta del administrador "${username}"?`)) return;

    try {
      await adminApi.deleteAdmin(id);
      loadAdmins();
      setAdminsMessage({ type: 'success', text: `Administrador "${username}" eliminado.` });
    } catch (err: any) {
      setAdminsMessage({ type: 'error', text: err.message || 'Error al eliminar administrador.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-surfaceLight rounded-2xl sm:rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-surfaceLight flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">Seguridad & Administradores</h3>
              <p className="text-xs text-slate-400 hidden sm:block">Cambia tus credenciales o crea cuentas de administrador</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surfaceLight transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surfaceLight px-3 sm:px-6 bg-background/50 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Mi Contraseña & Perfil</span>
          </button>

          <button
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'admins'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear & Gestionar Admins ({adminsList.length})</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB 1: MI PERFIL / CAMBIO DE CLAVE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {profileMessage && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
                    profileMessage.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  {profileMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de Usuario Administrador
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-background border border-surfaceLight rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="admin"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Puedes personalizar el nombre de usuario con el que inicias sesión.
                </p>
              </div>

              <div className="pt-2 border-t border-surfaceLight">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nueva Contraseña (opcional)
                </label>
                <div className="relative mb-3">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-background border border-surfaceLight rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="Dejar en blanco si solo cambias el usuario"
                  />
                </div>

                {newPassword && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirmar Nueva Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-background border border-surfaceLight rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="Repite la nueva contraseña"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-surfaceLight">
                <label className="block text-xs font-semibold text-amber-400 mb-1">
                  Contraseña Actual (Requerida para autorizar cambios) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-background border border-surfaceLight rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="Ingresa tu contraseña actual"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                  <Key className="w-4 h-4" />
                  <span>{profileLoading ? 'Guardando...' : 'Guardar Cambios de Perfil'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: CREAR Y GESTIONAR OTROS ADMINISTRADORES */}
          {activeTab === 'admins' && (
            <div className="space-y-6">
              {adminsMessage && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
                    adminsMessage.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  {adminsMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{adminsMessage.text}</span>
                </div>
              )}

              {/* Formulario nuevo admin */}
              <form onSubmit={handleCreateAdmin} className="bg-background/80 border border-surfaceLight p-4 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  <span>Crear Nuevo Usuario Administrador</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Usuario
                    </label>
                    <input
                      type="text"
                      required
                      value={newAdminUser}
                      onChange={(e) => setNewAdminUser(e.target.value)}
                      placeholder="ej: superadmin"
                      className="w-full bg-surface border border-surfaceLight rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Contraseña (mínimo 6 caracteres)
                    </label>
                    <input
                      type="password"
                      required
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface border border-surfaceLight rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={createAdminLoading}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{createAdminLoading ? 'Creando...' : 'Crear Administrador'}</span>
                  </button>
                </div>
              </form>

              {/* Lista de administradores */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">
                  Cuentas de Administrador Registradas
                </h4>
                {adminsLoading ? (
                  <p className="text-xs text-slate-400">Cargando administradores...</p>
                ) : (
                  <div className="divide-y divide-surfaceLight/60 border border-surfaceLight rounded-2xl overflow-hidden bg-background/50">
                    {adminsList.map((adm) => {
                      const isCurrent = adm.id === currentAdmin.id;
                      return (
                        <div key={adm.id} className="p-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{adm.username}</span>
                                {isCurrent && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                    En uso actual
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500">
                                Creado el {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>

                          {!isCurrent && (
                            <button
                              onClick={() => handleDeleteAdmin(adm.id, adm.username)}
                              title="Eliminar administrador"
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
