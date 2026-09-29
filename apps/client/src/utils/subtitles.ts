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

/**
 * Convierte un File (.srt o .vtt) a una URL de objeto WebVTT reproducible
 */
export async function createVttUrlFromFile(file: File): Promise<{ url: string; name: string }> {
  const text = await file.text();
  const vttText = convertSrtToVtt(text);
  const blob = new Blob([vttText], { type: 'text/vtt;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const cleanName = file.name.replace(/\.(srt|vtt)$/i, '');
  return { url, name: cleanName };
}
