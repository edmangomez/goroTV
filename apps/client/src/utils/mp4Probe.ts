// apps/client/src/utils/mp4Probe.ts

export interface AudioTrackInfo {
  id: number;
  language: string;       // código ISO 639 (ej: 'spa', 'eng', 'und')
  displayName: string;    // nombre legible (ej: 'Español', 'Inglés')
  codec?: string;         // 'mp4a', 'ac-3', etc.
}

// Mapeo de códigos de idioma a nombres legibles
const LANG_MAP: Record<string, string> = {
  spa: 'Español', es: 'Español', 'es-419': 'Español (Latino)',
  eng: 'Inglés', en: 'Inglés',
  por: 'Portugués', pt: 'Portugués',
  fra: 'Francés', fr: 'Francés',
  deu: 'Alemán', de: 'Alemán',
  ita: 'Italiano', it: 'Italiano',
  jpn: 'Japonés', ja: 'Japonés',
  und: 'Original', '': 'Original',
};

export function getDisplayName(lang: string): string {
  return LANG_MAP[lang.toLowerCase()] ?? lang.toUpperCase();
}

/**
 * Lee los últimos `chunkSize` bytes del MP4 para encontrar el átomo `moov`
 * y extraer las pistas de audio (trak con mdia > hdlr type = 'soun').
 * Usa HTTP Range requests directamente al proveedor IPTV.
 */
export async function probeAudioTracks(url: string, chunkSize = 2 * 1024 * 1024): Promise<AudioTrackInfo[]> {
  try {
    // 1. Obtener el tamaño total del archivo
    const headResp = await fetch(url, { method: 'HEAD' });
    if (!headResp.ok) return [];
    const total = parseInt(headResp.headers.get('content-length') ?? '0');
    if (!total) return [];

    // 2. Leer los últimos chunkSize bytes donde suele estar el átomo moov
    const start = Math.max(0, total - chunkSize);
    const rangeResp = await fetch(url, {
      headers: { Range: `bytes=${start}-${total - 1}` }
    });
    if (!rangeResp.ok) return [];

    const buffer = await rangeResp.arrayBuffer();
    return parseAudioTracksFromBuffer(buffer);
  } catch {
    return [];
  }
}

/**
 * Parsea el buffer buscando el átomo moov y extrayendo pistas de audio.
 */
function parseAudioTracksFromBuffer(buffer: ArrayBuffer): AudioTrackInfo[] {
  const view = new DataView(buffer);
  const tracks: AudioTrackInfo[] = [];
  let trackId = 0;

  function readAtom(offset: number, end: number): void {
    while (offset + 8 <= end) {
      const size = view.getUint32(offset);
      if (size < 8 || offset + size > end) break;
      const type = String.fromCharCode(
        view.getUint8(offset + 4), view.getUint8(offset + 5),
        view.getUint8(offset + 6), view.getUint8(offset + 7)
      );

      if (type === 'moov' || type === 'trak' || type === 'mdia' || type === 'minf' || type === 'stbl') {
        readAtom(offset + 8, offset + size);
      } else if (type === 'hdlr') {
        // hdlr: bytes 12-15 = handler_type
        if (offset + 16 <= end) {
          const handlerType = String.fromCharCode(
            view.getUint8(offset + 12), view.getUint8(offset + 13),
            view.getUint8(offset + 14), view.getUint8(offset + 15)
          );
          if (handlerType === 'soun') {
            trackId++;
          }
        }
      } else if (type === 'mdhd' && trackId > 0) {
        // mdhd contiene el idioma en bits 24-25 (3 chars ISO 639-2 encoded)
        if (offset + 28 <= end) {
          const version = view.getUint8(offset + 8);
          const langOffset = version === 1 ? offset + 28 : offset + 24;
          if (langOffset + 2 <= end) {
            const langCode = view.getUint16(langOffset);
            // Los 3 caracteres de idioma están en bits 14-10, 9-5, 4-0
            const c1 = ((langCode >> 10) & 0x1F) + 0x60;
            const c2 = ((langCode >> 5) & 0x1F) + 0x60;
            const c3 = (langCode & 0x1F) + 0x60;
            const lang = String.fromCharCode(c1, c2, c3).replace(/\0/g, '').toLowerCase();
            const existing = tracks.find(t => t.id === trackId);
            if (!existing) {
              tracks.push({ id: trackId, language: lang, displayName: getDisplayName(lang) });
            }
          }
        }
      }
      offset += size;
    }
  }

  readAtom(0, buffer.byteLength);
  return tracks.filter(t => t.language !== ''); // solo pistas con idioma detectado
}
