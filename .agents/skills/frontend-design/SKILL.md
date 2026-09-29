---
name: frontend-design
description: Guía y patrones de diseño frontend para goroTV. Enfatiza arquitectura de componentes React, Tailwind CSS, layouts responsive (TV/Desktop, Tablet, Móvil) y optimización de rendimiento para Smart TVs.
---

# Skill: Frontend Design (goroTV)

Esta skill proporciona principios de diseño y arquitectura frontend para la aplicación IPTV multiplataforma **goroTV**.

## Principios Fundamentales
1. **TV-First y Mobile-Adaptive**: Toda interfaz debe funcionar con fluidez tanto con control remoto (D-Pad) a 3 metros de distancia como con pantalla táctil en smartphones.
2. **Breakpoints Oficiales**:
   - `tv-desktop`: `>= 1024px` (Sidebar completa + Grid TiviMate)
   - `tablet`: `768px - 1023px` (Sidebar colapsada a íconos)
   - `mobile`: `<= 767px` (Bottom Tab Bar + Listas verticales con swipe)
3. **Cero Reflows Innecesarios**: Usar dimensiones fijas para pósters y miniaturas (aspect-ratio 16:9 para canales/video, 2:3 para pósters VOD).
4. **Foco Visual Impecable**: En pantallas grandes, el elemento activo debe tener outline contrastante, escala suave (`transform: scale(1.05)`) y sombra luminosa.
