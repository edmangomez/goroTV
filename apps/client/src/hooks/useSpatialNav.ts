import { useEffect } from 'react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface ModalEntry {
  id: string;
  onClose: () => void;
}

const modalStack: ModalEntry[] = [];

/**
 * Registra una función de cierre para un modal abierto.
 * Al presionar el botón Atrás del control remoto, el modal más reciente se cierra automáticamente.
 */
export function registerModal(id: string, onClose: () => void): () => void {
  // Evitar duplicados del mismo id
  const existingIdx = modalStack.findIndex((m) => m.id === id);
  if (existingIdx !== -1) {
    modalStack.splice(existingIdx, 1);
  }
  modalStack.push({ id, onClose });

  return () => {
    const idx = modalStack.findIndex((m) => m.id === id);
    if (idx !== -1) modalStack.splice(idx, 1);
  };
}

export function closeTopModal(): boolean {
  if (modalStack.length > 0) {
    const top = modalStack.pop();
    if (top) {
      top.onClose();
      return true;
    }
  }
  return false;
}

export function useSpatialNav(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const executeBackAction = (e?: Event) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      // 1. Si está enfocado en un campo de texto, desenfocar primero (oculta teclado virtual)
      if (isInput && activeEl) {
        activeEl.blur();
        if (e && e.cancelable) e.preventDefault();
        return;
      }

      // 2. Si hay modales en la pila registrada, cerrar el modal superior
      if (closeTopModal()) {
        if (e && e.cancelable) e.preventDefault();
        return;
      }

      // 3. Buscar modal o popup en el DOM para cerrarlo
      const openModal = document.querySelector<HTMLElement>(
        '[role="dialog"], [data-modal="true"], .fixed.inset-0.z-50:not([data-player="true"])'
      );
      if (openModal) {
        const closeBtn = openModal.querySelector<HTMLElement>(
          '[data-modal-close="true"], button[aria-label="Cerrar"], button.modal-close, button:has(.lucide-x)'
        );
        if (closeBtn) {
          if (e && e.cancelable) e.preventDefault();
          closeBtn.click();
          return;
        }
      }

      // 4. Si hay reproductor activo, salir al catálogo
      const playerBackBtn = document.querySelector<HTMLElement>('[data-player-back="true"]');
      if (playerBackBtn) {
        if (e && e.cancelable) e.preventDefault();
        playerBackBtn.click();
        return;
      }

      // 5. Notificar a oyentes personalizados de la app
      window.dispatchEvent(new CustomEvent('gorotv-back'));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      // MANEJO DE TECLA ATRÁS / ESCAPE / BACKSPACE / KEYCODE 4 (Control remoto TV)
      const isBackKey =
        e.key === 'Escape' ||
        e.keyCode === 27 ||
        e.keyCode === 4 ||
        (!isInput && (e.key === 'Backspace' || e.keyCode === 8));

      if (isBackKey) {
        executeBackAction(e);
        return;
      }

      // TECLAS DE DIRECCIÓN D-PAD
      let direction: Direction | null = null;
      if (e.key === 'ArrowUp' || e.keyCode === 38) direction = 'UP';
      else if (e.key === 'ArrowDown' || e.keyCode === 40) direction = 'DOWN';
      else if (e.key === 'ArrowLeft' || e.keyCode === 37) direction = 'LEFT';
      else if (e.key === 'ArrowRight' || e.keyCode === 39) direction = 'RIGHT';

      if (!direction) return;

      // Si está escribiendo en un input, permitir navegación horizontal del cursor de texto
      if (isInput && (direction === 'LEFT' || direction === 'RIGHT')) {
        return;
      }

      // AISLAMIENTO DE FOCO SI HAY MODAL ABIERTO
      const openModal = document.querySelector<HTMLElement>(
        '[role="dialog"], [data-modal="true"], .fixed.inset-0.z-50:not([data-player="true"])'
      );
      const scope: HTMLElement | Document = openModal || document;

      // NAVEGACIÓN DETERMINISTA POR ZONAS/COLUMNAS (TV Leanback)
      const activeCol = activeEl?.dataset.navCol;
      if (!openModal && activeCol) {
        // A. Movimiento Horizontal entre Columnas
        if (direction === 'RIGHT') {
          if (activeCol === 'menu') {
            const target =
              document.querySelector<HTMLElement>('[data-nav-col="categories"][data-nav-selected="true"]') ||
              document.querySelector<HTMLElement>('[data-nav-col="categories"]');
            if (target) {
              e.preventDefault();
              target.focus();
              target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              return;
            }
          } else if (activeCol === 'categories') {
            const target =
              document.querySelector<HTMLElement>('[data-nav-col="content"][data-nav-selected="true"]') ||
              document.querySelector<HTMLElement>('[data-nav-col="content"]');
            if (target) {
              e.preventDefault();
              target.focus();
              target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              return;
            }
          }
        } else if (direction === 'LEFT') {
          if (activeCol === 'content') {
            const target =
              document.querySelector<HTMLElement>('[data-nav-col="categories"][data-nav-selected="true"]') ||
              document.querySelector<HTMLElement>('[data-nav-col="categories"]');
            if (target) {
              e.preventDefault();
              target.focus();
              target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              return;
            }
          } else if (activeCol === 'categories') {
            const target =
              document.querySelector<HTMLElement>('[data-nav-col="menu"][data-nav-active="true"]') ||
              document.querySelector<HTMLElement>('[data-nav-col="menu"]');
            if (target) {
              e.preventDefault();
              target.focus();
              target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              return;
            }
          }
        }
      }

      // B. BÚSQUEDA RÁPIDA DE CANDIDATOS (Filtrado ligero para Smart TVs)
      const allNavElements = Array.from(scope.querySelectorAll<HTMLElement>('[data-nav="true"]'));
      const candidates = allNavElements.filter((el) => {
        if (el.offsetParent === null && window.getComputedStyle(el).position !== 'fixed') {
          return false;
        }
        if (el.hasAttribute('disabled')) return false;

        // Si estamos navegando verticalmente dentro de una columna definida, no saltar a otra columna
        if (!openModal && activeCol && (direction === 'UP' || direction === 'DOWN')) {
          if (el.dataset.navCol !== activeCol) return false;
        }

        return true;
      });

      if (candidates.length === 0) return;

      if (!activeEl || !candidates.includes(activeEl)) {
        candidates[0]?.focus();
        e.preventDefault();
        return;
      }

      const currentRect = activeEl.getBoundingClientRect();
      const currentCenter = {
        x: currentRect.left + currentRect.width / 2,
        y: currentRect.top + currentRect.height / 2,
      };

      let bestCandidate: HTMLElement | null = null;
      let minDistance = Infinity;

      for (const candidate of candidates) {
        if (candidate === activeEl) continue;

        const rect = candidate.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };

        const dx = center.x - currentCenter.x;
        const dy = center.y - currentCenter.y;

        let isMatchDirection = false;
        if (direction === 'RIGHT' && dx > 15) isMatchDirection = true;
        if (direction === 'LEFT' && dx < -15) isMatchDirection = true;
        if (direction === 'DOWN' && dy > 15) isMatchDirection = true;
        if (direction === 'UP' && dy < -15) isMatchDirection = true;

        if (isMatchDirection) {
          // Penalizar desviación perpendicular para mantener líneas rectas en listas
          const mainDist = direction === 'LEFT' || direction === 'RIGHT' ? Math.abs(dx) : Math.abs(dy);
          const crossDist = direction === 'LEFT' || direction === 'RIGHT' ? Math.abs(dy) : Math.abs(dx);
          const score = mainDist + crossDist * 2.5;

          if (score < minDistance) {
            minDistance = score;
            bestCandidate = candidate;
          }
        }
      }

      if (bestCandidate) {
        e.preventDefault();
        bestCandidate.focus();
        bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    };

    const handleCustomBack = (e: Event) => {
      executeBackAction(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('tvBackButton', handleCustomBack);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('tvBackButton', handleCustomBack);
    };
  }, [enabled]);
}
