import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { initDatabase, db } from './db/database.js';
import { seedDatabase } from './db/seed.js';
import { clientRouter } from './routes/clientRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware global
app.disable('x-powered-by');
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// Health check para Proxmox / Docker / Cloudflare Tunnel
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'goroTV Backend API',
    timestamp: new Date().toISOString()
  });
});

// Rutas de API
app.use('/api/client', clientRouter);
app.use('/api/admin', adminRouter);

// Tarea periódica de limpieza de sesiones obsoletas (> 75 segundos sin heartbeat)
setInterval(() => {
  try {
    const result = db.prepare(`
      DELETE FROM active_sessions 
      WHERE last_ping < datetime('now', '-75 seconds')
    `).run();
    if (result.changes > 0) {
      console.log(`[Sessions] ${result.changes} sesión(es) inactiva(s) limpiada(s) por timeout.`);
    }
  } catch (err) {
    console.error('[Sessions] Error al limpiar sesiones inactivas:', err);
  }
}, 30000);

// Inicializar base de datos y arrancar servidor
async function startServer() {
  try {
    initDatabase();
    await seedDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(`🚀 goroTV Backend API corriendo en puerto ${PORT}`);
      console.log(`📡 URL Health: http://localhost:${PORT}/api/health`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Error fatal al iniciar el servidor:', err);
    process.exit(1);
  }
}

startServer();
