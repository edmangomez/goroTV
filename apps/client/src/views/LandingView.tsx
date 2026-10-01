import React, { useState } from 'react';
import { VhsLogo } from '../components/common/VhsLogo';

// ─── URLs de descarga de APK ────────────────────────────────────────────────
// Actualiza estas URLs cuando tengas los APKs en tu servidor / GitHub Releases
const APK_FIRE_TV_URL   = '/downloads/gorotv-firetv.apk';
const APK_GOOGLE_TV_URL = '/downloads/gorotv-googletv.apk';
const EXE_WINDOWS_URL   = '/downloads/gorotv-windows.zip';
const EXE_WINDOWS_DIRECT = '/downloads/gorotv-windows.exe';
const GITHUB_RELEASE_URL = 'https://github.com/edmangomez/goroTV/releases/tag/v1.0.1';

export const LandingView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    { q: "¿Necesito suscripción?", a: "goroTV es un reproductor. Necesitas tu propia suscripción o lista IPTV de un proveedor de terceros." },
    { q: "¿Funciona en Smart TV?", a: "Sí, es compatible con Android TV, Fire TV, Samsung Tizen y LG webOS mediante navegadores o apps dedicadas." },
    { q: "¿Requiere VPN?", a: "El reproductor en sí no, pero puede que tu proveedor de IPTV o tu conexión a internet lo requieran." },
    { q: "¿Qué calidad de imagen?", a: "Soporta HD, Full HD y 4K, dependiendo del contenido que ofrezca tu proveedor." },
    { q: "¿Cómo contacto soporte?", a: "Puedes escribirnos a support@gorofamily.com." },
  ];

  return (
    <div className="min-h-screen bg-[#0D1117] text-white font-sans selection:bg-[#00D4FF] selection:text-black overflow-y-auto">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <VhsLogo width={48} />
          <span className="text-xl font-bold tracking-wider">goroTV</span>
        </div>
        <button 
          onClick={() => window.location.href = '/'}
          className="text-sm font-medium hover:text-[#00D4FF] transition-colors"
        >
          Abrir Reproductor &rarr;
        </button>
      </nav>

      {/* Hero */}
      <section className="relative px-6 py-20 text-center overflow-hidden bg-gradient-to-b from-[#0D1117] via-[#0d1f3c] to-[#0D1117]">
        <div className="absolute inset-0 opacity-50 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(0, 212, 255, 0.1) 0%, transparent 70%)' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="mb-8 animate-[pulse_3s_ease-in-out_infinite] drop-shadow-[0_0_15px_rgba(0,212,255,0.5)]">
            <VhsLogo width={180} />
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            goroTV <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] to-[#7B2FBE]">Player</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl">
            La mejor experiencia IPTV multiplataforma
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-[#00D4FF] text-[#0D1117] px-8 py-4 rounded-full text-lg font-bold hover:bg-cyan-300 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(0,212,255,0.3)] mb-10"
          >
            Empezar Gratis
          </button>
          <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-gray-300">
            <span className="flex items-center gap-2 bg-[#0f1923] border border-[#1E293B] px-4 py-2 rounded-full"><span className="text-[#00D4FF]">✓</span> HD & 4K</span>
            <span className="flex items-center gap-2 bg-[#0f1923] border border-[#1E293B] px-4 py-2 rounded-full"><span className="text-[#00D4FF]">✓</span> Multi-dispositivo</span>
            <span className="flex items-center gap-2 bg-[#0f1923] border border-[#1E293B] px-4 py-2 rounded-full"><span className="text-[#00D4FF]">✓</span> Sin contratos</span>
          </div>
        </div>
      </section>

      {/* Características */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Todo lo que necesitas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: "🎬", title: "Miles de canales en vivo", desc: "Soporte para listas M3U y Xtream Codes con EPG integrado." },
            { icon: "🎥", title: "VOD: Películas y Series", desc: "Catálogo organizado con carátulas, sinopsis y progreso de visualización." },
            { icon: "📺", title: "Compatible con Smart TVs", desc: "Interfaz optimizada para control remoto (D-Pad) en Android TV, Tizen y webOS." },
            { icon: "📱", title: "Funciona en iOS y Android", desc: "Diseño responsive que se adapta a tu móvil o tablet sin descargar apps pesadas." },
            { icon: "🔒", title: "Conexión directa y segura", desc: "Tu dispositivo se conecta directamente a tu proveedor, garantizando privacidad." },
            { icon: "⚡", title: "Baja latencia", desc: "Reproductor optimizado para streaming rápido y sin cortes." }
          ].map((feature, i) => (
            <div key={i} className="border border-[#1E293B] bg-[#0f1923] rounded-2xl p-6 hover:border-[#7B2FBE] transition-colors">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Descargas */}
      <section className="py-20 px-6 bg-[#0f1923] border-y border-[#1E293B]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Instalación por Plataforma</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Fire TV */}
            <div className="border border-[#1E293B] bg-[#0D1117] rounded-2xl p-6 flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🔥</span>
                  <h3 className="text-xl font-bold">Amazon Fire TV</h3>
                </div>
                <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">Sideload APK</span>
              </div>
              <ol className="list-decimal list-inside text-gray-400 space-y-2 text-sm">
                <li>Activa "Fuentes desconocidas" en Configuración → Mi Fire TV</li>
                <li>Abre la app <strong>Downloader</strong> desde la tienda</li>
                <li>Escribe la URL directa: <span className="block mt-1 font-mono text-xs text-orange-400 bg-black/50 p-1.5 rounded select-all break-all">http://tv.gorofamily.com/downloads/gorotv-firetv.apk</span></li>
              </ol>
              <a
                href={APK_FIRE_TV_URL}
                download="gorotv-firetv.apk"
                className="mt-auto flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar APK — Fire TV
              </a>
            </div>

            {/* Google TV / Android TV */}
            <div className="border border-[#1E293B] bg-[#0D1117] rounded-2xl p-6 flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">📺</span>
                  <h3 className="text-xl font-bold">Google TV / Android TV</h3>
                </div>
                <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">Sideload APK</span>
              </div>
              <ol className="list-decimal list-inside text-gray-400 space-y-2 text-sm">
                <li>Activa "Orígenes desconocidos" en Configuración → Seguridad</li>
                <li>Instala un gestor de archivos o <strong>Downloader</strong></li>
                <li>Descarga el APK o introduce: <span className="block mt-1 font-mono text-xs text-green-400 bg-black/50 p-1.5 rounded select-all break-all">http://tv.gorofamily.com/downloads/gorotv-googletv.apk</span></li>
              </ol>
              <a
                href={APK_GOOGLE_TV_URL}
                download="gorotv-googletv.apk"
                className="mt-auto flex items-center justify-center gap-2 w-full bg-[#00D4FF] hover:bg-cyan-300 text-[#0D1117] font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(0,212,255,0.3)]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar APK — Google TV
              </a>
            </div>

            {/* Windows PC */}
            <div className="border border-[#1E293B] bg-[#0D1117] rounded-2xl p-6 flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">💻</span>
                  <h3 className="text-xl font-bold">Windows (PC)</h3>
                </div>
                <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">Desktop App Nativa</span>
              </div>
              <ol className="list-decimal list-inside text-gray-400 space-y-2 text-sm">
                <li>Descarga la aplicación oficial para Windows 10/11</li>
                <li>Descomprime el ZIP o ejecuta directamente <strong>goroTV.exe</strong></li>
                <li>Disfruta de aceleración gráfica sin bloqueos de navegador</li>
              </ol>
              <div className="mt-auto flex flex-col gap-2">
                <a
                  href={EXE_WINDOWS_DIRECT}
                  download="gorotv-windows.exe"
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#7B2FBE] to-[#00D4FF] hover:from-purple-600 hover:to-cyan-400 text-white font-bold py-2.5 px-4 rounded-xl transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(123,47,190,0.4)] text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar Ejecutable (.exe)
                </a>
                <a
                  href={EXE_WINDOWS_URL}
                  download="gorotv-windows.zip"
                  className="flex items-center justify-center gap-2 w-full bg-[#1A2333] hover:bg-[#253248] text-gray-300 font-semibold py-2 px-4 rounded-xl transition-colors text-xs border border-[#2D3F58]"
                >
                  Descargar Paquete Portable (.zip)
                </a>
              </div>
            </div>
            <div className="border border-[#1E293B] bg-[#0D1117] rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">🖥️ Samsung Tizen</h3>
              <ol className="list-decimal list-inside text-gray-400 space-y-2 text-sm">
                <li>Abre Samsung App Store</li>
                <li>Busca 'goroTV'</li>
                <li>Instala y disfruta</li>
              </ol>
            </div>
            <div className="border border-[#1E293B] bg-[#0D1117] rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">📺 LG webOS</h3>
              <p className="text-gray-400 text-sm">Próximamente disponible en LG Content Store. Mientras tanto, usa el navegador integrado.</p>
            </div>
            <div className="border border-[#1E293B] bg-[#0D1117] rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">📱 iOS / Safari</h3>
              <ol className="list-decimal list-inside text-gray-400 space-y-2 text-sm">
                <li>Abre <strong>tv.gorofamily.com</strong> en Safari</li>
                <li>Toca el botón 'Compartir'</li>
                <li>Selecciona 'Añadir a Inicio'</li>
              </ol>
            </div>
            <div className="border border-[#1E293B] bg-[#0D1117] rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">🌐 Reproductor Web</h3>
              <p className="text-gray-400 text-sm mb-4">Disponible directamente en cualquier navegador moderno sin instalar nada.</p>
              <button onClick={() => window.location.href = '/'} className="text-[#00D4FF] font-medium hover:underline">Abrir Web Player &rarr;</button>
            </div>
          </div>

          {/* GitHub Releases Mirror */}
          <div className="mt-8 p-4 rounded-xl border border-[#1E293B] bg-[#0B0F19] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📦</span>
              <div>
                <p className="text-sm font-semibold text-gray-200">Repositorio y Espejo Oficial en GitHub</p>
                <p className="text-xs text-gray-400">Descarga los archivos binarios compilados directamente desde el Release v1.0.1 oficial.</p>
              </div>
            </div>
            <a
              href={GITHUB_RELEASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#00D4FF] hover:underline flex items-center gap-1 border border-[#00D4FF]/30 px-3 py-1.5 rounded-lg hover:bg-[#00D4FF]/10 transition-colors whitespace-nowrap"
            >
              Ver GitHub Release v1.0.1 &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Preguntas Frecuentes</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-[#1E293B] bg-[#0f1923] rounded-2xl overflow-hidden">
              <button 
                onClick={() => toggleFaq(i)}
                className="w-full px-6 py-4 text-left font-bold flex justify-between items-center hover:bg-[#131B2E] transition-colors"
              >
                {faq.q}
                <span className="text-[#00D4FF]">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4 text-gray-400 text-sm">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E293B] bg-[#0B0F19] pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <VhsLogo width={32} />
              <span className="font-bold text-lg">goroTV</span>
            </div>
            <p className="text-gray-400 text-sm max-w-xs">Tu reproductor IPTV multiplataforma definitivo. Rápido, seguro y sin complicaciones.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Enlaces</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-[#00D4FF]">Inicio</a></li>
              <li><a href="#" className="hover:text-[#00D4FF]">Características</a></li>
              <li><a href="#" className="hover:text-[#00D4FF]">Descargas</a></li>
              <li><a href="#" className="hover:text-[#00D4FF]">Soporte</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Contacto & Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="mailto:support@gorofamily.com" className="hover:text-[#00D4FF]">support@gorofamily.com</a></li>
              <li><button onClick={() => alert('Política de Privacidad')} className="hover:text-[#00D4FF]">Política de Privacidad</button></li>
              <li><button onClick={() => alert('Términos de Servicio')} className="hover:text-[#00D4FF]">Términos de Servicio</button></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-[#1E293B] pt-8 text-xs text-gray-500 text-center md:text-left">
          <p className="mb-2"><strong>Disclaimer:</strong> goroTV Player no distribuye ni aloja contenidos de televisión. Es una aplicación reproductora que acepta URLs de proveedores IPTV de terceros. El contenido es responsabilidad exclusiva del proveedor de servicio IPTV contratado por el usuario.</p>
          <p>&copy; {new Date().getFullYear()} goroTV Player. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};
