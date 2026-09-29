import { useEffect } from 'react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export function useSpatialNav(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Teclas de dirección
      let direction: Direction | null = null;
      if (e.key === 'ArrowUp' || e.keyCode === 38) direction = 'UP';
      else if (e.key === 'ArrowDown' || e.keyCode === 40) direction = 'DOWN';
      else if (e.key === 'ArrowLeft' || e.keyCode === 37) direction = 'LEFT';
      else if (e.key === 'ArrowRight' || e.keyCode === 39) direction = 'RIGHT';

      if (direction) {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('[data-nav="true"]'))
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
          });

        if (candidates.length === 0) return;

        const activeEl = document.activeElement as HTMLElement | null;
        if (!activeEl || !candidates.includes(activeEl)) {
          // Si no hay elemento enfocado, enfocar el primer candidato
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
            // Penalizar desviación angular perpendicular para mantener líneas rectas en grids
            const mainDist = direction === 'LEFT' || direction === 'RIGHT' ? Math.abs(dx) : Math.abs(dy);
            const crossDist = direction === 'LEFT' || direction === 'RIGHT' ? Math.abs(dy) : Math.abs(dx);
            const score = mainDist + crossDist * 2.0;

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
