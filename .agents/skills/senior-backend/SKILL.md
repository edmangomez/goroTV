---
name: senior-backend
description: Buenas prácticas de backend en Node.js, Express/Fastify y SQLite persistente. Seguridad, hashing, control de concurrencia de sesiones y gestión de tiempo de expiración.
---

# Skill: Senior Backend (goroTV)

Especializada en servicios backend rápidos, seguros y con huella de memoria mínima para Proxmox LXC.

## Estándares de Backend
1. **Rendimiento SQLite**:
   - Usar modo WAL (`PRAGMA journal_mode = WAL;`) para permitir lecturas y escrituras concurrentes sin bloqueos.
   - Usar sentencias preparadas (`prepared statements`) para prevenir inyecciones SQL y maximizar velocidad.
2. **Seguridad**:
   - Hashear contraseñas usando bcrypt o argon2.
   - Encriptar credenciales de proveedores Xtream en reposo usando AES-256-GCM con clave en variable de entorno.
   - Tokens JWT firmados con expiración corta para peticiones API y refresh token para la app.
3. **Control de Sesiones Concurrentes (Heartbeat)**:
   - Los clientes envían ping cada 30 segundos (`/api/client/heartbeat`).
   - Una tarea en segundo plano (o trigger de consulta) expira sesiones sin ping tras 75 segundos.
   - Al llegar una nueva conexión, si `COUNT(active_sessions) >= max_connections`, rechazar con código `409 Conflict` (Límite de pantallas alcanzado).
4. **Verificación de Expiración**:
   - Validar matemáticamente `expires_at > datetime('now')` en cada login y verificación de status.
   - Si caducó, responder con `403 Forbidden` y el timestamp de vencimiento.
