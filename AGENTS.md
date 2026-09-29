# Directrices de Desarrollo de goroTV (AGENTS.md)

Este repositorio contiene el ecosistema **goroTV**, una solución IPTV multiplataforma completa:
- `apps/server`: Backend API en Node.js + Express con base de datos SQLite persistente.
- `apps/admin`: Panel Web de Administración (React + Vite + Tailwind CSS).
- `apps/client`: App Cliente IPTV multiplataforma (React + Vite + Shaka Player + Tailwind CSS).
- `platforms/`: Wrappers Hosted para Smart TVs (Android TV/Fire TV, Samsung Tizen, LG webOS).
- `deploy/`: Orquestación Docker Compose y script de aprovisionamiento Proxmox LXC.

## Reglas Clave del Proyecto
1. **Flujo de Video**: El reproductor siempre se conecta directamente al proveedor IPTV. El backend/LXC y Cloudflare Tunnel solo manejan la UI y la API.
2. **Control de Sesiones**: Todo cliente que inicie sesión con Cuenta de Servicio debe reportar heartbeat cada 30 segundos.
3. **Control Remoto (D-Pad)**: Cualquier nueva pantalla o diálogo interactivo en la App Cliente debe tener soporte de navegación con teclas de flecha, Enter y Volver (Escape/Backspace).
4. **Responsive**: Todo componente cliente debe probarse y funcionar adecuadamente en TV/Desktop (≥1024px), Tablet (768-1023px) y Móvil (≤767px con Bottom Tab Bar).
5. **Subtítulos y Audio**: El reproductor debe permitir seleccionar pistas de audio y subtítulos embebidos en el contenido, además de ajustar el estilo visual (tamaño, color, fondo).
