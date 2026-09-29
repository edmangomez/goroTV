---
name: senior-architect
description: Principios de arquitectura global, diseño de monorepo, Dockerización multi-stage, Proxmox LXC y túneles seguros con Cloudflare Tunnel.
---

# Skill: Senior Architect (goroTV)

Diseño de arquitectura de infraestructura y ciclo de vida de la aplicación.

## Arquitectura de Despliegue en Proxmox LXC
1. **Contenedor LXC**:
   - OS: Debian 12 Minimal.
   - Opciones Proxmox: `features: nesting=1,keyctl=1` (para permitir Docker nativo dentro del LXC sin máquinas virtuales pesadas).
   - Recursos recomendados: 1 vCPU, 512MB - 1GB RAM, 8GB Disco.
2. **Cloudflare Tunnel (`cloudflared`)**:
   - Sin puertos abiertos (WAN) en el router ni en el firewall de Proxmox.
   - Tráfico web/API encriptado con TLS de punta a punta.
   - El tráfico de video NO viaja a través del túnel: el reproductor cliente resuelve y transmite directo desde la CDN del proveedor Xtream.
3. **Monorepo**:
   - `apps/server`: Express + SQLite.
   - `apps/client`: React 19 + Vite (Hosted Web App).
   - `apps/admin`: React 19 + Vite (Panel Dashboard).
   - `platforms/`: Wrappers Hosted para Smart TVs (Android TV, Tizen, webOS).
   - `deploy/`: docker-compose.yml, Dockerfiles y script `proxmox-setup.sh`.
