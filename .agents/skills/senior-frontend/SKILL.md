---
name: senior-frontend
description: Estándares de ingeniería frontend React 19 + TypeScript. Patrones de virtualización, gestión de estado de alto rendimiento, Shaka Player, Hls.js y Web APIs.
---

# Skill: Senior Frontend (goroTV)

Guía técnica de arquitectura React moderna para streaming de video y apps multimedia.

## Principios Técnicos
1. **Virtualización Obligatoria**: Usar virtualización para listas de canales (>1,000 elementos) para que solo existan en el DOM los elementos visibles.
2. **Ciclo de Vida del Reproductor**:
   - Destruir instancias de Hls.js / Shaka Player limpiamente al desmontar componentes o cambiar de canal (`player.destroy()`).
   - Liberar buffers de video para evitar `OutOfMemory` en Smart TVs con poca RAM (ej. 1GB en Tizen/webOS económicos).
3. **Manejo de Errores en Streams**:
   - Reintento con backoff exponencial si la conexión HLS falla (hasta 3 reintentos).
   - Detección de streams caídos con mensaje al usuario: *"Canal temporalmente fuera de línea"*.
4. **Hooks Modulares**:
   - `useSpatialNav`: Control de foco por teclado/remoto.
   - `useHeartbeat`: Envío de pings cada 30s al backend para mantener la sesión viva.
   - `useDeviceType`: Detección en caliente del modo TV, Desktop, Tablet o Móvil.
