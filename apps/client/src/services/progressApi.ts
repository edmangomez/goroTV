import { PlaybackProgress } from '../types';
import { localDB } from './db';

const API_BASE = '/api/client';

function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem('gorotv_client_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session.token || null;
  } catch {
    return null;
  }
}

// Control de throttle para guardado en backend (máximo 1 guardado cada 5 segundos por streamId)
const lastSavedMap = new Map<string, number>();

export const progressApi = {
  /**
   * Obtiene la lista de contenidos pendientes de continuar viendo.
   * Prioriza el backend si hay sesión y sincroniza con Dexie (IndexedDB).
   */
  async getProgress(contentType?: 'movie' | 'series'): Promise<PlaybackProgress[]> {
    const token = getAuthToken();

    if (token) {
      try {
        const url = contentType
          ? `${API_BASE}/progress?type=${contentType}`
          : `${API_BASE}/progress`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const serverItems: PlaybackProgress[] = await res.json();
          // Sincronizar en Dexie para disponibilidad offline o rápida
          for (const item of serverItems) {
            await localDB.savePlaybackProgress({
              contentType: item.contentType,
              streamId: item.streamId,
              seriesId: item.seriesId,
              seasonNum: item.seasonNum,
              episodeNum: item.episodeNum,
              episodeId: item.episodeId,
              title: item.title,
              subtitle: item.subtitle,
              posterUrl: item.posterUrl,
              progressSeconds: item.progressSeconds,
              durationSeconds: item.durationSeconds,
              completed: !!item.completed,
              updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
            });
          }
          return serverItems;
        }
      } catch (err) {
        console.warn('[progressApi] Error al sincronizar con backend, usando caché local:', err);
      }
    }

    // Fallback a Dexie / IndexedDB
    const localItems = await localDB.getPlaybackProgress(contentType);
    return localItems.map((item) => ({
      ...item,
      updatedAt: item.updatedAt,
    }));
  },

  /**
   * Guarda el progreso de reproducción actual.
   * Guarda inmediatamente en Dexie y notifica al servidor (con throttle de 5s o forzado).
   */
  async saveProgress(data: PlaybackProgress, force = false): Promise<void> {
    const key = `${data.contentType}_${data.streamId}`;
    const now = Date.now();
    const lastSaved = lastSavedMap.get(key) || 0;

    // Guardado local inmediato en Dexie
    const isCompleted = data.durationSeconds > 0 && data.progressSeconds / data.durationSeconds >= 0.9;
    await localDB.savePlaybackProgress({
      contentType: data.contentType,
      streamId: data.streamId,
      seriesId: data.seriesId,
      seasonNum: data.seasonNum,
      episodeNum: data.episodeNum,
      episodeId: data.episodeId,
      title: data.title,
      subtitle: data.subtitle,
      posterUrl: data.posterUrl,
      progressSeconds: data.progressSeconds,
      durationSeconds: data.durationSeconds,
      completed: isCompleted,
      updatedAt: now,
    });

    // Si no es forzado y pasaron menos de 4.5 segundos, evitar petición HTTP
    if (!force && now - lastSaved < 4500) {
      return;
    }
    lastSavedMap.set(key, now);

    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch(`${API_BASE}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn('[progressApi] Error al guardar progreso en servidor:', err);
    }
  },

  /**
   * Elimina un registro de progreso (cuando el usuario hace clic en 'X' o termina el contenido).
   */
  async deleteProgress(contentType: 'movie' | 'series', streamId: number): Promise<void> {
    const key = `${contentType}_${streamId}`;
    lastSavedMap.delete(key);

    await localDB.deletePlaybackProgress(contentType, streamId);

    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch(`${API_BASE}/progress/${contentType}/${streamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.warn('[progressApi] Error al eliminar progreso en servidor:', err);
    }
  },
};
