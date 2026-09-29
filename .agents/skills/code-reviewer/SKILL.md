---
name: code-reviewer
description: Checklist de calidad, seguridad, accesibilidad y rendimiento para revisiones de código en goroTV.
---

# Skill: Code Reviewer (goroTV)

Directrices de verificación de código antes de dar por completado cada módulo.

## Checklist de Revisión
- [ ] **Seguridad**: ¿Las consultas SQL están parametrizadas contra inyecciones?
- [ ] **Secretos**: ¿No hay credenciales ni tokens duros en el código cliente?
- [ ] **Memoria**: ¿Se limpian los listeners de teclado/D-pad y las instancias de video en `useEffect` cleanup?
- [ ] **Responsive**: ¿El componente se comporta adecuadamente en las 3 vistas (TV/Desktop, Tablet y Móvil)?
- [ ] **Manejo de Errores**: ¿Hay estados visuales para "Cargando", "Error al reproducir", "Suscripción vencida" y "Límite de pantallas alcanzado"?
- [ ] **Foco**: ¿Todos los elementos interactivos tienen feedback visual claro y accesible con teclado/remoto?
