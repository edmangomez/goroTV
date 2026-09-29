/**
 * Utilidad robusta para gestión de Pantalla Completa (Fullscreen API)
 * Incluye Fullscreen API nativo (para monitores/TVs con F11 real)
 * y Fallback automático de Web Fullscreen (CSS Viewport Fullscreen)
 * para entornos con API bloqueada (emuladores DevTools, iframes y navegadores móviles).
 */

let isWebFullscreenActive = false;
const changeListeners = new Set<(active: boolean) => void>();

function notifyChangeListeners(active: boolean) {
  changeListeners.forEach((callback) => {
    try {
      callback(active);
    } catch (err) {
      console.warn('[Fullscreen] Error en listener:', err);
    }
  });
}

/**
 * Comprueba si la API nativa del navegador tiene la pantalla completa activa
 */
export function isNativeFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.webkitCurrentFullScreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

/**
 * Comprueba si hay cualquier modo de pantalla completa activo (nativo o web viewport)
 */
export function isFullscreenActive(): boolean {
  return isNativeFullscreenActive() || isWebFullscreenActive;
}

export function isFullscreenSupported(): boolean {
  return true;
}

/**
 * Activa Web Fullscreen (Modo Cine por CSS) como fallback seguro
 */
function activateWebFullscreen(element?: HTMLElement | null) {
  isWebFullscreenActive = true;
  document.documentElement.classList.add('gorotv-web-fullscreen');
  document.body.classList.add('gorotv-web-fullscreen');
  if (element && element !== document.documentElement && element !== document.body) {
    element.classList.add('gorotv-web-fullscreen');
  }
  notifyChangeListeners(true);
}

/**
 * Desactiva Web Fullscreen (CSS)
 */
function deactivateWebFullscreen() {
  if (isWebFullscreenActive) {
    isWebFullscreenActive = false;
    document.documentElement.classList.remove('gorotv-web-fullscreen');
    document.body.classList.remove('gorotv-web-fullscreen');
    document.querySelectorAll('.gorotv-web-fullscreen').forEach((el) => {
      el.classList.remove('gorotv-web-fullscreen');
    });
    notifyChangeListeners(false);
  }
}

/**
 * Solicita entrar a pantalla completa.
 * Primero intenta la API nativa del navegador; si es rechazada o bloqueada por permisos,
 * activa inmediatamente el fallback CSS Web Fullscreen sin interrumpir la experiencia.
 */
export async function requestAppFullscreen(preferredElement?: HTMLElement | null): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  const doc = document as any;
  const root = document.documentElement as any;

  // 1. Soporte especial para iOS Safari (reproductor de video nativo)
  if (preferredElement && typeof (preferredElement as any).webkitEnterFullscreen === 'function') {
    try {
      (preferredElement as any).webkitEnterFullscreen();
      return true;
    } catch {}
  }

  // 2. Determinar elemento destino (el contenedor específico o la raíz)
  const target = (preferredElement && preferredElement !== doc.body) ? preferredElement : root;
  const requestFn =
    target.requestFullscreen ||
    target.webkitRequestFullscreen ||
    target.webkitRequestFullScreen ||
    target.mozRequestFullScreen ||
    target.msRequestFullscreen;

  if (typeof requestFn === 'function') {
    try {
      const promise = requestFn.call(target);
      if (promise && typeof promise.then === 'function') {
        try {
          await promise;
          isWebFullscreenActive = false;
          notifyChangeListeners(true);
          return true;
        } catch (promiseErr) {
          console.info('[Fullscreen] Permiso nativo denegado o bloqueado por el entorno, activando Web Fullscreen:', promiseErr);
          activateWebFullscreen(preferredElement);
          return true;
        }
      } else {
        // En navegadores antiguos que no retornan Promise
        setTimeout(() => {
          if (!isNativeFullscreenActive()) {
            activateWebFullscreen(preferredElement);
          } else {
            notifyChangeListeners(true);
          }
        }, 100);
        return true;
      }
    } catch (err) {
      console.info('[Fullscreen] Excepción en requestFullscreen nativo, activando Web Fullscreen:', err);
      activateWebFullscreen(preferredElement);
      return true;
    }
  }

  // 3. Fallback directo si el navegador no tiene ninguna API nativa
  activateWebFullscreen(preferredElement);
  return true;
}

/**
 * Sale de cualquier modo de pantalla completa (nativo o web)
 */
export async function exitAppFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  // Desactivar fallback CSS
  deactivateWebFullscreen();

  const doc = document as any;
  const exitFn =
    doc.exitFullscreen ||
    doc.webkitExitFullscreen ||
    doc.webkitCancelFullScreen ||
    doc.mozCancelFullScreen ||
    doc.msExitFullscreen;

  if (isNativeFullscreenActive() && typeof exitFn === 'function') {
    try {
      const promise = exitFn.call(doc);
      if (promise && typeof promise.then === 'function') {
        await promise;
      }
    } catch (err) {
      console.warn('[Fullscreen] Error al salir de fullscreen nativo:', err);
    }
  }

  notifyChangeListeners(false);
  return true;
}

/**
 * Conmuta entre pantalla completa y modo normal
 */
export async function toggleAppFullscreen(preferredElement?: HTMLElement | null): Promise<boolean> {
  if (isFullscreenActive()) {
    await exitAppFullscreen();
    return false;
  } else {
    return await requestAppFullscreen(preferredElement);
  }
}

/**
 * Suscribe un callback a cualquier cambio de estado de pantalla completa
 */
export function addFullscreenChangeListener(callback: (isActive: boolean) => void): () => void {
  changeListeners.add(callback);

  if (typeof document === 'undefined') {
    return () => changeListeners.delete(callback);
  }

  const handler = () => {
    callback(isFullscreenActive());
  };

  const events = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange',
  ];

  events.forEach((evt) => document.addEventListener(evt, handler));

  // Escuchar tecla Escape para salir de Web Fullscreen si la API nativa no lo capturó
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isWebFullscreenActive) {
      deactivateWebFullscreen();
    }
  };
  window.addEventListener('keydown', keyHandler);

  return () => {
    changeListeners.delete(callback);
    events.forEach((evt) => document.removeEventListener(evt, handler));
    window.removeEventListener('keydown', keyHandler);
  };
}
