import React, { useState } from 'react';
import { User, Calendar, Tv, Sliders, LogOut, Info, ShieldCheck } from 'lucide-react';
import { ClientSession, SubtitleStyle } from '../types';
import { getOrCreateDeviceId, getDeviceName } from '../services/authApi';
import { SubtitleStyleModal } from '../components/player/SubtitleStyleModal';

interface SettingsViewProps {
  session: ClientSession;
  onLogout: () => void;
  subtitleStyle: SubtitleStyle;
  onChangeSubtitleStyle: (style: SubtitleStyle) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  session,
  onLogout,
  subtitleStyle,
  onChangeSubtitleStyle,
}) => {
  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const deviceId = getOrCreateDeviceId();
  const deviceName = getDeviceName();

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-4xl mx-auto w-full h-full min-h-0 space-y-6">
      <h2 className="text-xl font-black text-white tracking-tight">Ajustes & Cuenta</h2>

      {/* Tarjeta de Cuenta de Suscripción */}
      <div className="bg-surface rounded-3xl p-6 border border-surfaceLight/80 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Información de la Cuenta</h3>
            <p className="text-xs text-slate-400">
              {session.mode === 'service' ? 'Suscripción Activa goroTV' : 'Conexión Xtream Codes Directa'}
            </p>
          </div>
        </div>

        {session.serviceUser ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-background border border-surfaceLight">
              <span className="text-xs text-slate-400 block mb-1">Usuario</span>
              <span className="text-base font-bold text-white">{session.serviceUser.username}</span>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-surfaceLight">
              <span className="text-xs text-slate-400 block mb-1">Vigencia</span>
              <span className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{session.serviceUser.daysRemaining} días restantes</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-surfaceLight">
              <span className="text-xs text-slate-400 block mb-1">Pantallas Simultáneas</span>
              <span className="text-base font-bold text-cyan-400 flex items-center gap-1.5">
                <Tv className="w-4 h-4" />
                <span>Hasta {session.serviceUser.maxConnections} pantallas</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-background border border-surfaceLight text-xs space-y-2 font-mono">
            <div>
              <span className="text-slate-400">Servidor: </span>
              <span className="text-blue-400">{session.provider.host}</span>
            </div>
            <div>
              <span className="text-slate-400">Usuario: </span>
              <span className="text-white">{session.provider.username}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tarjeta de Preferencias de Reproductor */}
      <div className="bg-surface rounded-3xl p-6 border border-surfaceLight/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Subtítulos y Reproducción</h3>
              <p className="text-xs text-slate-400">Configuración visual de texto y formato</p>
            </div>
          </div>

          <button
            type="button"
            data-nav="true"
            onClick={() => setStyleModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
          >
            Personalizar
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 bg-background rounded-xl border border-surfaceLight">
            <span className="text-slate-400 block">Tamaño:</span>
            <span className="font-bold text-white capitalize">{subtitleStyle.fontSize}</span>
          </div>
          <div className="p-3 bg-background rounded-xl border border-surfaceLight">
            <span className="text-slate-400 block">Color:</span>
            <span className="font-bold text-white capitalize">{subtitleStyle.color}</span>
          </div>
          <div className="p-3 bg-background rounded-xl border border-surfaceLight">
            <span className="text-slate-400 block">Fondo:</span>
            <span className="font-bold text-white capitalize">{subtitleStyle.background}</span>
          </div>
        </div>
      </div>

      {/* Dispositivo y Versión */}
      <div className="bg-surface rounded-3xl p-6 border border-surfaceLight/80 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Información del Dispositivo</span>
        </div>
        <div className="text-xs text-slate-400 font-mono space-y-1">
          <div>Dispositivo: <strong className="text-slate-200">{deviceName}</strong></div>
          <div>ID de Sesión: <strong className="text-slate-200">{deviceId}</strong></div>
          <div>Aplicación: <strong className="text-blue-400">goroTV v1.0.0 (Multiplataforma)</strong></div>
        </div>
      </div>

      {/* Botón de Cerrar Sesión */}
      <div className="pt-4">
        <button
          type="button"
          data-nav="true"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 py-3.5 rounded-2xl font-bold text-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      <SubtitleStyleModal
        isOpen={styleModalOpen}
        onClose={() => setStyleModalOpen(false)}
        style={subtitleStyle}
        onChangeStyle={onChangeSubtitleStyle}
      />
    </div>
  );
};
