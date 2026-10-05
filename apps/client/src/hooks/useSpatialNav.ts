import { useEffect } from 'react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export function useSpatialNav(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      // 1. MANEJO DE TECLA ATRÁS / ESCAPE / BACKSPACE / KEYCODE 4 (Control remoto TV)
      const isBackKey =
        e.key === 'Escape' ||
        e.keyCode === 27 ||
        e.keyCode === 4 ||
        (!isInput && (e.key === 'Backspace' || e.keyCode === 8));

      if (isBackKey) {
        // Si está enfocado en un campo de texto, desenfocar primero (cierra teclado en pantalla)
        if (isInput && activeEl) {
          activeEl.blur();
          e.preventDefault();
          return;
        }

        // Buscar modal o popup activo para cerrarlo
        const openModal = document.querySelector<HTMLElement>(
          '[role="dialog"], [data-modal="true"], .fixed.inset-0.z-50'
        );
        if (openModal) {
          const closeBtn = openModal.querySelector<HTMLElement>(
            '[data-modal-close="true"], button[aria-label="Cerrar"], button.modal-close, button:has(.lucide-x)'
          );
          if (closeBtn) {
            e.preventDefault();
            closeBtn.click();
            return;
          }
        }

        // Si no hay modal pero hay reproductor activo, presionar botón volver del reproductor
        const playerBackBtn = document.querySelector<HTMLElement>('[data-player-back="true"]');
        if (playerBackBtn) {
          e.preventDefault();
          playerBackBtn.click();
          return;
        }

        // Disparar evento global para vistas que manejen botón volver personalizado
        window.dispatchEvent(new CustomEvent('gorotv-back'));
        return;
      }

      // 2. TECLAS DE DIRECCIÓN D-PAD
      let direction: Direction | null = null;
      if (e.key === 'ArrowUp' || e.keyCode === 38) direction = 'UP';
      else if (e.key === 'ArrowDown' || e.keyCode === 40) direction = 'DOWN';
      else if (e.key === 'ArrowLeft' || e.keyCode === 37) direction = 'LEFT';
      else if (e.key === 'ArrowRight' || e.keyCode === 39) direction = 'RIGHT';

      if (!direction) return;

      // Si está escribiendo en un input, permitir navegación horizontal natural del cursor
      if (isInput && (direction === 'LEFT' || direction === 'RIGHT')) {
        return;
      }

      // 3. AISLAMIENTO DE FOCO SI HAY MODAL ABIERTO
      const openModal = document.querySelector<HTMLElement>(
        '[role="dialog"], [data-modal="true"], .fixed.inset-0.z-50:not([data-player="true"])'
      );
      const scope: HTMLElement | Document = openModal || document;

      // 4. BÚSQUEDA RÁPIDA DE CANDIDATOS (Filtrado ultra ligero para Smart TVs)
      const allNavElements = Array.from(scope.querySelectorAll<HTMLElement>('[data-nav="true"]'));
      const candidates = allNavElements.filter((el) => {
        // offsetParent !== null descarta elementos con display:none o desmontados sin forzar reflow
        if (el.offsetParent === null && window.getComputedStyle(el).position !== 'fixed') {
          return false;
        }
        if (el.hasAttribute('disabled')) return false;
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
          // Penalizar desviación perpendicular para mantener líneas rectas
          const mainDist = direction === 'LEFT' || direction === 'RIGHT' ? Math.abs(dx) : Math.abs(dy);
          const crossDist = direction === 'LEFT' || direction === 'RIGHT' ? Math.abs(dy) : Math.abs(dx);
          const score = mainDist + crossDist * 2.2;

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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
