/**
 * Utilidades para manejo y conversión de subtítulos externos (SRT / WebVTT)
 */

export function convertSrtToVtt(content: string): string {
  const normalized = content.replace(/\r\n|\r/g, '\n').trim();

  // Si ya es un archivo WebVTT válido
  if (normalized.startsWith('WEBVTT')) {
    return normalized;
  }

  // Convertir marcas de tiempo SRT (00:00:00,000) a WebVTT (00:00:00.000)
  const convertedTimestamps = normalized.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    '$1.$2 --> $3.$4'
  );

  return `WEBVTT\n\n${convertedTimestamps}`;
}

export interface SubtitleCueItem {
  start: number; // segundos
  end: number;   // segundos
  text: string;
}

export function parseTimestamp(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseFloat(s.replace(',', '.'));
  } else if (parts.length === 2) {
    const [m, s] = parts;
    return parseInt(m, 10) * 60 + parseFloat(s.replace(',', '.'));
  }
  return 0;
}

/**
 * Parsea contenido WebVTT / SRT a un array ordenado de cues con timestamps en segundos
 */
export function parseVttToCues(content: string): SubtitleCueItem[] {
  const cues: SubtitleCueItem[] = [];
  if (!content) return cues;
  const normalized = content.replace(/\r\n|\r/g, '\n');
  const cueBlockRegex = /((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})[^\n]*\n([\s\S]*?)(?=\n\s*(?:(?:(?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3}\s*-->)|\n|$))/g;

  let match: RegExpExecArray | null;
  while ((match = cueBlockRegex.exec(normalized)) !== null) {
    const startTime = parseTimestamp(match[1]);
    const endTime = parseTimestamp(match[2]);
    const rawText = match[3] ? match[3].trim() : '';
    // Eliminar etiquetas HTML o WebVTT (ej: <b>, <i>, <v Name>, etc.)
    const cleanText = rawText.replace(/<[^>]+>/g, '').trim();
    if (cleanText && endTime > startTime) {
      cues.push({ start: startTime, end: endTime, text: cleanText });
    }
  }
  return cues;
}

/**
 * Convierte un File (.srt o .vtt) a una URL de objeto WebVTT reproducible junto con cues parseadas
 */
export async function createVttUrlFromFile(file: File): Promise<{ url: string; name: string; cues: SubtitleCueItem[]; rawVttText: string }> {
  const text = await file.text();
  const vttText = convertSrtToVtt(text);
  const blob = new Blob([vttText], { type: 'text/vtt;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const cleanName = file.name.replace(/\.(srt|vtt)$/i, '');
  const cues = parseVttToCues(vttText);
  return { url, name: cleanName, cues, rawVttText: vttText };
}
