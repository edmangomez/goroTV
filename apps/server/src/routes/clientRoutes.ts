import { Router } from 'express';
import {
  clientLogin,
  getClientStatus,
  clientHeartbeat,
  clientCloseSession,
  searchSubtitles,
  downloadSubtitle,
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

