import React, { useState, useEffect, useCallback } from 'react';
import { ClientSession, SubtitleStyle } from './types';
import { authApi } from './services/authApi';
import { useDeviceType } from './hooks/useDeviceType';
import { useSpatialNav } from './hooks/useSpatialNav';
import { Sidebar } from './components/layout/Sidebar';
import { BottomTabBar } from './components/layout/BottomTabBar';
import { Header } from './components/layout/Header';
import { LoginView } from './views/LoginView';
import { LiveTVView } from './views/LiveTVView';
import { MoviesView } from './views/MoviesView';
import { SeriesView } from './views/SeriesView';
import { FavoritesView } from './views/FavoritesView';
import { GlobalSearchView } from './views/GlobalSearchView';
import { SettingsView } from './views/SettingsView';
import { SessionLimitModal } from './views/SessionLimitModal';
import { ExpiredModal } from './views/ExpiredModal';
import { toggleAppFullscreen } from './utils/fullscreen';
import { IosInstallPrompt } from './components/pwa/IosInstallPrompt';
import { LandingView } from './views/LandingView';

export const App: React.FC = () => {
  // Sesión guardada en almacenamiento local
  const [session, setSession] = useState<ClientSession | null>(() => {
    const saved = localStorage.getItem('gorotv_client_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Atajo de teclado global 'f' / 'F' para alternar pantalla completa estilo YouTube
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input, textarea o select
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      // Si hay un reproductor de video en pantalla, VideoPlayer gestiona 'f'
      if (document.querySelector('video')) return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleAppFullscreen(document.documentElement);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Tab activa
  const [activeTab, setActiveTab] = useState<'live' | 'movies' | 'series' | 'favorites' | 'search' | 'settings'>('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Estados de control de sesiones y expiración
  const [sessionLimitError, setSessionLimitError] = useState<{ open: boolean; maxAllowed: number }>({
    open: false,
    maxAllowed: 1,
  });
  const [expiredError, setExpiredError] = useState<{ open: boolean; expiresAt?: string }>({
    open: false,
  });

  // Estilo visual de subtítulos
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(() => {
    const saved = localStorage.getItem('gorotv_subtitle_style');
    return saved ? JSON.parse(saved) : { fontSize: 'medium', color: 'white', background: 'semi' };
  });

  // Dispositivo y Navegación Espacial D-Pad
  const { isMobile, isTablet } = useDeviceType();
  useSpatialNav(true);

  // Guardar estilo de subtítulos
  const handleUpdateSubtitleStyle = (style: SubtitleStyle) => {
    setSubtitleStyle(style);
    localStorage.setItem('gorotv_subtitle_style', JSON.stringify(style));
  };

  // Heartbeat para cuenta de servicio
  const sendHeartbeatPing = useCallback(async () => {
    if (!session || session.mode !== 'service' || !session.token) return;

    try {
      await authApi.sendHeartbeat(session.token);
      setSessionLimitError((prev) => ({ ...prev, open: false }));
    } catch (err: any) {
      if (err.code === 'SESSION_LIMIT_EXCEEDED') {
        setSessionLimitError({ open: true, maxAllowed: err.maxAllowed || 1 });
      } else if (err.code === 'ACCOUNT_EXPIRED') {
        setExpiredError({ open: true, expiresAt: err.expiresAt });
      }
    }
  }, [session]);

  // Sincronizar estado del usuario y proveedor desde el servidor al iniciar
  useEffect(() => {
    if (!session || session.mode !== 'service' || !session.token) return;

    let isMounted = true;
    authApi
      .getStatus(session.token)
      .then((status) => {
        if (!isMounted) return;
        setSession((prev) => {
          if (!prev) return null;
          const updated: ClientSession = {
            ...prev,
            serviceUser: {
              id: status.id,
              username: status.username,
              displayName: status.displayName,
              expiresAt: status.expiresAt,
              daysRemaining: status.daysRemaining,
              maxConnections: status.maxConnections,
            },
            provider: status.provider,
          };
          localStorage.setItem('gorotv_client_session', JSON.stringify(updated));
          return updated;
        });
      })
      .catch((err) => {
        console.warn('[Session] Error de sincronización inicial:', err);
        if (err.code === 'ACCOUNT_EXPIRED' || err.code === 'ACCOUNT_SUSPENDED' || err.code === 'FORBIDDEN') {
          handleLogout();
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (session && session.mode === 'service' && session.token) {
      sendHeartbeatPing();
      const interval = setInterval(sendHeartbeatPing, 30000);
      return () => clearInterval(interval);
    }
  }, [session, sendHeartbeatPing]);

  // Cierre de sesión
  const handleLogout = useCallback(() => {
    if (session && session.token) {
      authApi.closeSession(session.token);
    }
    localStorage.removeItem('gorotv_client_session');
    setSession(null);
    setSessionLimitError({ open: false, maxAllowed: 1 });
    setExpiredError({ open: false });
  }, [session]);

  // Inicio de sesión exitoso
  const handleLoginSuccess = (newSession: ClientSession) => {
    localStorage.setItem('gorotv_client_session', JSON.stringify(newSession));
    setSession(newSession);
    setActiveTab('live');
  };

  // Ruta pública: Landing Page sin autenticación
  if (window.location.pathname === '/iptv-player') {
    return <LandingView />;
  }

  // Si no hay sesión, mostrar pantalla de Login
  if (!session) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <IosInstallPrompt />
      </>
    );
  }

  // Título de la pestaña activa
  const tabTitles = {
    live: 'Televisión en Vivo',
    movies: 'Películas VOD',
    series: 'Series de TV',
    favorites: 'Favoritos',
    search: 'Búsqueda Global',
    settings: 'Ajustes',
  };

  return (
    <div className="flex h-screen bg-background text-[#F8FAFC] overflow-hidden select-none">
      {/* Sidebar para TV y Desktop / Tablet */}
      {!isMobile && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSearchQuery('');
          }}
          session={session}
          onLogout={handleLogout}
          collapsed={isTablet || sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden ${isMobile ? 'pb-16' : ''}`}>
        <Header
          title={tabTitles[activeTab]}
          session={session}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showSearch={activeTab !== 'settings' && activeTab !== 'search'}
        />

        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'live' && <LiveTVView session={session} searchQuery={searchQuery} />}
          {activeTab === 'movies' && <MoviesView session={session} searchQuery={searchQuery} />}
          {activeTab === 'series' && <SeriesView session={session} searchQuery={searchQuery} />}
          {activeTab === 'favorites' && <FavoritesView session={session} searchQuery={searchQuery} />}
          {activeTab === 'search' && <GlobalSearchView session={session} />}
          {activeTab === 'settings' && (
            <SettingsView
              session={session}
              onLogout={handleLogout}
              subtitleStyle={subtitleStyle}
              onChangeSubtitleStyle={handleUpdateSubtitleStyle}
            />
          )}
        </main>
      </div>

      {/* Bottom Tab Bar para Móvil */}
      {isMobile && (
        <BottomTabBar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSearchQuery('');
          }}
        />
      )}

      {/* Modales de Control de Sesión y Expiración */}
      <SessionLimitModal
        isOpen={sessionLimitError.open}
        maxAllowed={sessionLimitError.maxAllowed}
        onLogout={handleLogout}
        onRetry={sendHeartbeatPing}
      />

      <ExpiredModal
        isOpen={expiredError.open}
        expiresAt={expiredError.expiresAt}
        onLogout={handleLogout}
      />

      {/* Sugerencia de instalación PWA en iPhone / iOS */}
      <IosInstallPrompt />
    </div>
  );
};
