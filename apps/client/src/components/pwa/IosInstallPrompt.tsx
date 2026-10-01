import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Smartphone } from 'lucide-react';

export const IosInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detectar iOS (iPhone, iPad, iPod)
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    
    // Detectar si ya está en modo standalone (instalada como PWA)
    const isStandalone =
      ('standalone' in navigator && (navigator as any).standalone === true) ||
      window.matchMedia('(display-mode: standalone)').matches;

    // Verificar si el usuario ya descartó el aviso en esta sesión o anteriormente
    const isDismissed = localStorage.getItem('gorotv_ios_install_dismissed') === 'true';

    if (isIos && !isStandalone && !isDismissed) {
      // Mostrar con una pequeña animación tras 2 segundos para no obstruir la carga inicial
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('gorotv_ios_install_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="bg-[#111827]/95 backdrop-blur-md border border-blue-500/30 rounded-2xl p-4 shadow-2xl shadow-blue-950/50 text-white">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-600/30">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-sm leading-tight text-white">Instalar goroTV</h4>
              <p className="text-xs text-blue-200/80">Experiencia App Pantalla Completa</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Cerrar sugerencia de instalación"
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-300 mb-3 leading-relaxed">
          Instala goroTV en la pantalla de inicio de tu iPhone para navegar sin barras de Safari y con controles táctiles optimizados:
        </p>

        <div className="bg-[#1F2937]/70 rounded-xl p-2.5 text-xs text-gray-200 space-y-2 mb-3 border border-gray-700/50">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Toca el botón</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-800 text-blue-400 font-medium border border-gray-700">
                <Share className="w-3.5 h-3.5" /> Compartir
              </span>
              <span>en Safari</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Selecciona</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-800 text-green-400 font-medium border border-gray-700">
                <PlusSquare className="w-3.5 h-3.5" /> Agregar a inicio
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-xl text-xs font-medium transition-all shadow-md shadow-blue-600/30"
        >
          ¡Entendido!
        </button>
      </div>
    </div>
  );
};
