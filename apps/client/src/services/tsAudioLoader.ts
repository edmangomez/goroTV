import mpegts from 'mpegts.js';
import { MediaTrack } from '../types';

/**
 * TSDualAudioProcessor
 * Escanea paquetes TS (188 bytes) en chunks de datos, detecta la tabla PMT
 * y descubre si el canal cuenta con transmisión Dual Audio (múltiples PIDs de audio).
 * Si el usuario selecciona la pista secundaria (índice 1), intercambia los PIDs en memoria
 * para que el demuxer MSE consuma el audio alternativo con 0 latencia y sin reconectar.
 */
export class TSDualAudioProcessor {
  public selectedAudioIndex: number = 0;
  public audioPids: number[] = [];
  public pmtPid: number = -1;
  private onTracksDiscovered?: (tracks: MediaTrack[]) => void;
  private hasDispatchedTracks = false;

  constructor(
    initialAudioIndex = 0,
    onTracksDiscovered?: (tracks: MediaTrack[]) => void
  ) {
    this.selectedAudioIndex = initialAudioIndex;
    this.onTracksDiscovered = onTracksDiscovered;
  }

  public setAudioIndex(index: number) {
    this.selectedAudioIndex = index;
  }

  public processChunk(chunk: ArrayBuffer): ArrayBuffer {
    const u8 = new Uint8Array(chunk);
    const len = u8.length;

    for (let i = 0; i <= len - 188; i += 188) {
      if (u8[i] !== 0x47) {
        // Resincronización al inicio de paquete TS (0x47)
        while (i < len && u8[i] !== 0x47) i++;
        if (i > len - 188) break;
      }

      const byte1 = u8[i + 1];
      const byte2 = u8[i + 2];
      const pid = ((byte1 & 0x1f) << 8) | byte2;

      // 1. PAT (PID 0): Descubrir PMT PID si aún no se conoce
      if (pid === 0 && this.pmtPid === -1) {
        const payloadStart = i + 4 + (u8[i + 3] & 0x20 ? u8[i + 4] + 1 : 0);
        if (payloadStart < i + 188) {
          const ptr = u8[payloadStart];
          const tableStart = payloadStart + 1 + ptr;
          if (tableStart + 12 < i + 188 && u8[tableStart] === 0x00) {
            const secLen = ((u8[tableStart + 1] & 0x0f) << 8) | u8[tableStart + 2];
            for (let p = tableStart + 8; p < tableStart + secLen - 4; p += 4) {
              const progNum = (u8[p] << 8) | u8[p + 1];
              const pPid = ((u8[p + 2] & 0x1f) << 8) | u8[p + 3];
              if (progNum !== 0) {
                this.pmtPid = pPid;
                break;
              }
            }
          }
        }
      }

      // 2. PMT: Inspeccionar streams elementales y detectar Dual Audio
      if (pid === this.pmtPid || pid === 4096) {
        this.pmtPid = pid;
        const payloadStart = i + 4 + (u8[i + 3] & 0x20 ? u8[i + 4] + 1 : 0);
        if (payloadStart < i + 188) {
          const ptr = u8[payloadStart];
          const tableStart = payloadStart + 1 + ptr;
          if (tableStart + 12 < i + 188 && u8[tableStart] === 0x02) {
            const secLen = ((u8[tableStart + 1] & 0x0f) << 8) | u8[tableStart + 2];
            const progInfoLen = ((u8[tableStart + 10] & 0x0f) << 8) | u8[tableStart + 11];
            let offset = tableStart + 12 + progInfoLen;
            const foundAudio: number[] = [];

            while (offset < tableStart + secLen - 4) {
              const streamType = u8[offset];
              const elemPid = ((u8[offset + 1] & 0x1f) << 8) | u8[offset + 2];
              const esInfoLen = ((u8[offset + 3] & 0x0f) << 8) | u8[offset + 4];

              // Códecs de audio MPEG-TS (ADTS AAC, LOAS AAC, AC3, EAC3, MP3)
              if (
                streamType === 0x0f ||
                streamType === 0x11 ||
                streamType === 0x81 ||
                streamType === 0x87 ||
                streamType === 0x03 ||
                streamType === 0x04
              ) {
                if (!foundAudio.includes(elemPid)) {
                  foundAudio.push(elemPid);
                }
              }
              offset += 5 + esInfoLen;
            }

            if (foundAudio.length > 1 && !this.hasDispatchedTracks) {
              this.audioPids = foundAudio;
              this.hasDispatchedTracks = true;
              console.info('[TSProcessor] Dual Audio detectado con PIDs:', this.audioPids);
              if (this.onTracksDiscovered) {
                const mediaTracks: MediaTrack[] = this.audioPids.map((p, idx) => ({
                  id: idx,
                  name:
                    idx === 0
                      ? 'Pista 1: Audio Principal (Español / Estéreo)'
                      : `Pista ${idx + 1}: Audio Secundario (Inglés / Dual)`,
                  lang: idx === 0 ? 'es' : 'en',
                  type: 'audio',
                  active: idx === this.selectedAudioIndex,
                  channels: 2,
                  codec: 'aac',
                }));
                this.onTracksDiscovered(mediaTracks);
              }
            }
          }
        }
      }

      // 3. Intercambio de PIDs si el usuario seleccionó la pista secundaria (Dual Audio)
      if (this.selectedAudioIndex === 1 && this.audioPids.length >= 2) {
        const pid1 = this.audioPids[0];
        const pid2 = this.audioPids[1];

        if (pid === pid1) {
          u8[i + 1] = (byte1 & 0xe0) | (pid2 >> 8);
          u8[i + 2] = pid2 & 0xff;
        } else if (pid === pid2) {
          u8[i + 1] = (byte1 & 0xe0) | (pid1 >> 8);
          u8[i + 2] = pid1 & 0xff;
        }
      }
    }

    return u8.buffer;
  }
}

/**
 * DualAudioFetchStreamLoader
 * Implementación de BaseLoader de mpegts.js con streaming Fetch y soporte de audio dual transparente.
 */
export class DualAudioFetchStreamLoader extends mpegts.BaseLoader {
  public static activeProcessor: TSDualAudioProcessor | null = null;
  private _seekHandler: any;
  private _config: any;
  private _requestAbort = false;
  private _abortController: AbortController | null = null;
  private _receivedLength = 0;
  private _processor: TSDualAudioProcessor;

  private _dataSource: any;
  private _range: any;

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.fetch && !!window.ReadableStream;
  }

  constructor(seekHandler: any, config: any) {
    super('dual-audio-fetch-stream-loader');
    this._seekHandler = seekHandler;
    this._config = config;
    this._needStash = true;

    const initialIdx = config?.selectedAudioTrackIndex || 0;
    const onTracks = config?.onAudioTracksDiscovered;
    this._processor = new TSDualAudioProcessor(initialIdx, onTracks);
    DualAudioFetchStreamLoader.activeProcessor = this._processor;
  }

  public destroy(): void {
    if (this.isWorking()) {
      this.abort();
    }
    DualAudioFetchStreamLoader.activeProcessor = null;
    super.destroy();
  }

  public isWorking(): boolean {
    return (
      this._status === mpegts.LoaderStatus.kConnecting ||
      this._status === mpegts.LoaderStatus.kBuffering
    );
  }

  public abort(): void {
    this._requestAbort = true;
    if (this._abortController) {
      try {
        this._abortController.abort();
      } catch {}
    }
    this._status = mpegts.LoaderStatus.kComplete;
  }

  public open(dataSource: any, range: any): void {
    this._dataSource = dataSource;
    this._range = range;
    this._status = mpegts.LoaderStatus.kConnecting;

    const sourceURL = dataSource.url;
    const seekConfig = this._seekHandler?.getConfig
      ? this._seekHandler.getConfig(sourceURL, range)
      : { headers: {} };

    const headers = new Headers();
    if (seekConfig && seekConfig.headers) {
      for (const [k, v] of Object.entries(seekConfig.headers)) {
        headers.append(k, String(v));
      }
    }

    this._abortController = new AbortController();

    fetch(sourceURL, {
      method: 'GET',
      headers,
      mode: 'cors',
      cache: 'no-cache',
      signal: this._abortController.signal,
    })
      .then((res) => {
        if (res.ok && res.body) {
          this._status = mpegts.LoaderStatus.kBuffering;
          return this._pump(res.body.getReader());
        } else {
          this._status = mpegts.LoaderStatus.kError;
          if (this.onError) {
            (this.onError as any)(mpegts.LoaderErrors.HTTP_STATUS_CODE_INVALID, {
              code: res.status,
              msg: res.statusText,
            });
          }
        }
      })
      .catch((err) => {
        if (this._abortController && this._abortController.signal.aborted) {
          return;
        }
        this._status = mpegts.LoaderStatus.kError;
        if (this.onError) {
          (this.onError as any)(mpegts.LoaderErrors.EXCEPTION, { code: -1, msg: err.message });
        }
      });
  }

  private _pump(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
    return reader.read().then((result) => {
      if (result.done) {
        this._status = mpegts.LoaderStatus.kComplete;
        if (this.onComplete) {
          const from = this._range?.from || 0;
          this.onComplete(from, from + this._receivedLength - 1);
        }
        return;
      }

      if (this._requestAbort) {
        this._status = mpegts.LoaderStatus.kComplete;
        return reader.cancel();
      }

      this._status = mpegts.LoaderStatus.kBuffering;
      const rawBuffer = result.value.buffer.slice(
        result.value.byteOffset,
        result.value.byteOffset + result.value.byteLength
      ) as ArrayBuffer;

      // Procesar el chunk para detección y conmutación de audio dual
      const processed = this._processor.processChunk(rawBuffer);
      const from = this._range?.from || 0;
      const byteStart = from + this._receivedLength;
      this._receivedLength += processed.byteLength;

      if (this.onDataArrival) {
        this.onDataArrival(processed, byteStart, this._receivedLength);
      }

      return this._pump(reader);
    });
  }
}
