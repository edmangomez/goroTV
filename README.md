# goroTV — Ecosistema IPTV Multiplataforma

[![goroTV](https://img.shields.io/badge/goroTV-Streaming_Platform-blue.svg)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22%2F24-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://docker.com)

**goroTV** es una plataforma IPTV multiplataforma integral, diseñada para Smart TVs, navegadores web, computadoras y dispositivos móviles, con su propio panel administrativo de gestión de clientes, proveedores y suscripciones con control de vigencia.

---

## Estructura del Repositorio

```
iptv_new/
├── .agents/skills/          # 9 Skills especializadas de Antigravity instaladas
├── apps/
│   ├── client/              # App Cliente IPTV (TiviMate style, D-Pad, Hls.js, Subtítulos)
│   ├── admin/               # Panel Web de Gestión (Clientes, Tiempos, Proveedores Xtream)
│   └── server/              # Backend API en Node.js + Express con base de datos SQLite
├── platforms/
│   ├── android-tv/          # Hosted Web App para Android TV y Amazon Fire TV
│   ├── tizen/               # Hosted Web App para Samsung Smart TV (Tizen 4.0+)
│   └── webos/               # Hosted Web App para LG Smart TV (webOS 4.0+)
└── deploy/
    ├── docker-compose.yml   # Orquestador para Proxmox LXC
    ├── Dockerfile.server    # Imagen de producción del Backend API
    ├── Dockerfile.apps      # Imagen Nginx para Client y Admin
    ├── nginx.conf           # Configuración de proxy inverso
    ├── proxmox-setup.sh     # Script automatizado de aprovisionamiento en Proxmox VE
    └── DEPLOY_GUIDE.md      # Guía paso a paso para el despliegue
```

---

## Características Principales

### 1. App Cliente IPTV (`apps/client`)
- **Diseño Adaptativo (3 Breakpoints)**:
  - **TV / Desktop (≥1024px)**: Barra lateral completa, cuadrícula estilo TiviMate, preview EPG y foco D-Pad para control remoto físico.
  - **Tablet (768-1023px)**: Barra lateral colapsable y cuadrícula táctil.
  - **Móvil (≤767px)**: Barra de pestañas inferior (*Bottom Tab Bar*), listas verticales y reproductor táctil.
- **Reproductor Universal de Video**:
  - Compatible con HLS (`.m3u8`), MPEG-TS (`.ts`), MP4 y MKV.
  - **Selector de Audio y Subtítulos**: Detección de pistas embebidas del stream con selector en pantalla (OSD) y personalización visual (tamaño, color y fondo).
  - El tráfico de video viaja **directamente entre el reproductor y el proveedor**, sin consumir el ancho de banda del servidor LXC ni del túnel de Cloudflare.
- **Doble Modalidad de Inicio de Sesión**:
  - **Cuenta goroTV**: Conexión a tu panel administrativo con validación de expiración, días restantes en pantalla y entrega transparente del proveedor asignado.
  - **Xtream Directo**: Conexión directa mediante servidor, usuario y contraseña.
- **Favoritos e Historial**: Almacenamiento local ultrarrápido con IndexedDB (Dexie).

### 2. Panel Administrativo (`apps/admin`)
- **Dashboard de Métricas**: Clientes totales, activos, por vencer en 5 días, vencidos y pantallas en vivo.
- **Gestión de Clientes**:
  - Crear usuarios y contraseñas para la app.
  - Asignar proveedor Xtream correspondiente.
  - Control de tiempo de vigencia: presets rápidos (+30d, +90d, +180d, +1 año) o fecha personalizada.
  - Renovación rápida de suscripción con 1 clic.
  - Suspender/activar clientes.
  - Monitoreo y desconexión forzada de pantallas simultáneas activas.
- **Gestión de Proveedores Xtream Codes**:
  - Registro de servidores maestros con encriptación AES-256-GCM en reposo.
  - Botón de **"Probar Conexión"** en tiempo real (prueba conexión, latencia, fecha de vencimiento y conexiones activas con el proveedor upstream).

### 3. Backend API (`apps/server`)
- Desarrollado en Node.js (TypeScript) con base de datos nativa SQLite (`node:sqlite`).
- Control de concurrencia de pantallas en vivo mediante *heartbeat* cada 30 segundos.
- Tarea periódica de limpieza de sesiones inactivas (>75 segundos sin ping).
- Huella de memoria mínima (<150 MB de RAM).

---

## Comandos de Desarrollo Local

```bash
# Instalar dependencias en todo el monorepo
npm install

# Compilar todos los paquetes
npm run build

# Ejecutar el backend API (puerto 3001)
npm run dev:server

# Ejecutar el panel administrativo (puerto 3002)
npm run dev:admin

# Ejecutar la app cliente (puerto 3000)
npm run dev:client
```

---

## Despliegue en Proxmox VE con Cloudflare Tunnel

Consulta la guía completa en [deploy/DEPLOY_GUIDE.md](file:///c:/proyectos/iptv_new/deploy/DEPLOY_GUIDE.md) para el aprovisionamiento automatizado en tu servidor Proxmox VE.
