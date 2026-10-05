import { Router } from 'express';
import {
  clientLogin,
  getClientStatus,
  clientHeartbeat,
  clientCloseSession,
  searchSubtitles,
  downloadSubtitle,
  proxyXtreamApi,
  getClientProgress,
  saveClientProgress,
  deleteClientProgress,
  probeVodStream,
  streamVodAudioBridge,
} from '../controllers/clientController.js';
import { requireClient } from '../middleware/clientMiddleware.js';

export const clientRouter = Router();

// Endpoint público para login de la App Cliente goroTV
clientRouter.post('/login', clientLogin);

// Endpoints de subtítulos externos (abiertos / públicos para el reproductor)
clientRouter.get('/subtitles/search', searchSubtitles);
clientRouter.get('/subtitles/download', downloadSubtitle);

// Endpoints protegidos para clientes activos
clientRouter.get('/status', requireClient, getClientStatus);
clientRouter.post('/heartbeat', requireClient, clientHeartbeat);
clientRouter.delete('/session', requireClient, clientCloseSession);

// Proxy transparente para metadatos de Xtream Codes (evita Mixed Content HTTPS)
clientRouter.get('/xtream', requireClient, proxyXtreamApi);

// Progreso de reproducción estilo Netflix ("Continuar viendo")
clientRouter.get('/progress', requireClient, getClientProgress);
clientRouter.post('/progress', requireClient, saveClientProgress);
clientRouter.delete('/progress/:contentType/:streamId', requireClient, deleteClientProgress);

// Bridge de audio al vuelo y probador de streams (.mkv / AC-3)
clientRouter.get('/stream/probe', requireClient, probeVodStream);
clientRouter.get('/stream/vod', requireClient, streamVodAudioBridge);


