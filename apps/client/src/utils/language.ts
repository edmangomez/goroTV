/**
 * Utilidades para normalización y formateo de idiomas de audio y subtítulos en español.
 */

export const LANGUAGE_MAP_ES: Record<string, string> = {
  // Español
  'es': 'Español',
  'spa': 'Español',
  'esl': 'Español',
  'es-419': 'Español (Latinoamérica)',
  'es-la': 'Español (Latinoamérica)',
  'es-latam': 'Español (Latinoamérica)',
  'es-es': 'Español (España)',
  'es-mx': 'Español (México)',
  'es-ar': 'Español (Argentina)',
  'es-co': 'Español (Colombia)',

  // Inglés
  'en': 'Inglés',
  'eng': 'Inglés',
  'en-us': 'Inglés (EE. UU.)',
  'en-gb': 'Inglés (Reino Unido)',

  // Francés
  'fr': 'Francés',
  'fra': 'Francés',
  'fre': 'Francés',

  // Alemán
  'de': 'Alemán',
  'deu': 'Alemán',
  'ger': 'Alemán',

  // Italiano
  'it': 'Italiano',
  'ita': 'Italiano',

  // Portugués
  'pt': 'Portugués',
  'por': 'Portugués',
  'pt-br': 'Portugués (Brasil)',
  'pt-pt': 'Portugués (Portugal)',

  // Otros idiomas frecuentes
  'ja': 'Japonés',
  'jpn': 'Japonés',
  'zh': 'Chino',
  'zho': 'Chino',
  'chi': 'Chino',
  'ru': 'Ruso',
  'rus': 'Ruso',
  'ko': 'Coreano',
  'kor': 'Coreano',
  'ar': 'Árabe',
  'ara': 'Árabe',
  'hi': 'Hindi',
  'hin': 'Hindi',
  'nl': 'Holandés',
  'nld': 'Holandés',
  'dut': 'Holandés',
  'pl': 'Polaco',
  'pol': 'Polaco',
  'tr': 'Turco',
  'tur': 'Turco',
  'sv': 'Sueco',
  'swe': 'Sueco',
  'no': 'Noruego',
  'nor': 'Noruego',
  'da': 'Danés',
  'dan': 'Danés',
  'fi': 'Finlandés',
  'fin': 'Finlandés',
  'el': 'Griego',
  'ell': 'Griego',
  'gre': 'Griego',
  'he': 'Hebreo',
  'heb': 'Hebreo',
  'cs': 'Checo',
  'ces': 'Checo',
  'cze': 'Checo',
  'ro': 'Rumano',
  'ron': 'Rumano',
  'rum': 'Rumano',
  'hu': 'Húngaro',
  'hun': 'Húngaro',
  'uk': 'Ucraniano',
  'ukr': 'Ucraniano',
  'und': 'Original',
  'qaa': 'Audio Original',
  'mul': 'Múltiples idiomas',
  'mis': 'Sin catalogar',
};

/**
 * Mapea códigos de idioma y etiquetas a nombres legibles en español.
 * Ejemplos:
 *  - 'es-419' -> 'Español (Latinoamérica)'
 *  - 'es', 'spa' -> 'Español'
 *  - 'es-es', label 'Castellano' -> 'Español (España)'
 *  - 'en', 'eng' -> 'Inglés'
 *  - 'fr', 'fra' -> 'Francés'
 *  - 'de', 'ger' -> 'Alemán'
 *  - 'it', 'ita' -> 'Italiano'
 *  - 'pt', 'por' -> 'Portugués'
 */
export function formatLanguageName(langCode?: string | null, rawLabel?: string | null): string {
  const code = (langCode || '').trim().toLowerCase();
  const label = (rawLabel || '').trim();
  const combined = `${code} ${label}`.toLowerCase();

  // Detección contextual de Español Latinoamericano
  if (
    code === 'es-419' ||
    code === 'es-la' ||
    code === 'es-latam' ||
    combined.includes('latino') ||
    combined.includes('latam') ||
    combined.includes('latin') ||
    combined.includes('(la)') ||
    combined.includes('[la]') ||
    combined.includes('spa (la') ||
    combined.includes('spanish latin')
  ) {
    return 'Español (Latinoamérica)';
  }

  // Detección contextual de Español de España
  if (
    code === 'es-es' ||
    combined.includes('castellano') ||
    combined.includes('españa') ||
    combined.includes('spain') ||
    combined.includes('(es)') ||
    combined.includes('[es]')
  ) {
    return 'Español (España)';
  }

  // Detección contextual de Portugués de Brasil
  if (
    code === 'pt-br' ||
    combined.includes('brasil') ||
    combined.includes('brazil') ||
    combined.includes('(br)') ||
    combined.includes('[br]')
  ) {
    return 'Portugués (Brasil)';
  }

  // Buscar coincidencia exacta en diccionario
  if (code && LANGUAGE_MAP_ES[code]) {
    return LANGUAGE_MAP_ES[code];
  }

  // Buscar prefijo (ej: "en-US" -> "en")
  const baseCode = code.split(/[-_]/)[0];
  if (baseCode && LANGUAGE_MAP_ES[baseCode]) {
    return LANGUAGE_MAP_ES[baseCode];
  }

  // Fallback con API estándar Intl del navegador
  if (code && code !== 'und') {
    try {
      if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
        const dn = new Intl.DisplayNames(['es'], { type: 'language' });
        const intlName = dn.of(code);
        if (intlName) {
          return intlName.charAt(0).toUpperCase() + intlName.slice(1);
        }
      }
    } catch {
      // Ignorar excepción si el código es inválido para Intl
    }
  }

  // Si tiene etiqueta descriptiva del stream
  if (label && label.toLowerCase() !== 'und' && label.toLowerCase() !== 'undefined') {
    // Si la etiqueta tiene nombre reconocible
    const labelLower = label.toLowerCase();
    if (labelLower.includes('spanish') || labelLower.includes('español')) return 'Español';
    if (labelLower.includes('english') || labelLower.includes('inglés') || labelLower.includes('ingles')) return 'Inglés';
    if (labelLower.includes('french') || labelLower.includes('français') || labelLower.includes('francés')) return 'Francés';
    if (labelLower.includes('german') || labelLower.includes('deutsch') || labelLower.includes('alemán')) return 'Alemán';
    if (labelLower.includes('italian') || labelLower.includes('italiano')) return 'Italiano';
    if (labelLower.includes('portuguese') || labelLower.includes('português') || labelLower.includes('portugués')) return 'Portugués';
    return label;
  }

  // Código en mayúsculas si no hay otra información
  if (code && code !== 'und') {
    return code.toUpperCase();
  }

  return 'Original';
}

/**
 * Normaliza nombres de códec de audio para mostrar etiquetas claras.
 */
export function formatAudioCodec(codec?: string | null): string | null {
  if (!codec) return null;
  const lower = codec.toLowerCase();
  if (lower.includes('ec-3') || lower.includes('eac3') || lower.includes('e-ac-3')) {
    return 'Dolby Digital Plus (E-AC3)';
  }
  if (lower.includes('ac-3') || lower.includes('ac3')) {
    return 'Dolby Digital (AC3)';
  }
  if (lower.includes('mp4a.40.2') || lower.includes('mp4a.40.5') || lower.includes('aac')) {
    return 'AAC';
  }
  if (lower.includes('mp3') || lower.includes('mp4a.6b')) {
    return 'MP3';
  }
  if (lower.includes('opus')) {
    return 'Opus';
  }
  if (lower.includes('flac')) {
    return 'FLAC';
  }
  return null;
}

/**
 * Formatea número de canales a formato legible (Estéreo, 5.1, etc.).
 */
export function formatAudioChannels(channels?: number | null): string | null {
  if (!channels || channels <= 0) return null;
  if (channels === 1) return 'Mono';
  if (channels === 2) return 'Estéreo';
  if (channels === 6) return '5.1 Surround';
  if (channels === 8) return '7.1 Surround';
  return `${channels} Canales`;
}
