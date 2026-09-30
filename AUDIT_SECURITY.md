# Informe de Auditoría de Seguridad — goroTV

**Fecha:** Septiembre 2026  
**Objetivo:** Ecosistema completo goroTV (Backend Express, Base de Datos SQLite, Frontend Cliente React, Panel Admin React, Nginx Proxy y Despliegue LXC/Cloudflare).  
**Metodología:** Revisión de código estático (SAST), análisis de arquitectura, inspección de configuración de red y buenas prácticas OWASP Top 10.

---

## 1. Resumen Ejecutivo y Matriz de Hallazgos

| ID | Vulnerabilidad / Hallazgo | Componente | Severidad | Estado |
|---|---|---|:---:|:---:|
| **SEC-01** | SSRF (Server-Side Request Forgery) en descarga de subtítulos | `apps/server/clientController.ts` | **CRÍTICA** | Identificada |
| **SEC-02** | Ausencia de Rate Limiting contra Ataques de Fuerza Bruta | `apps/server/index.ts` / Login Endpoints | **ALTA** | Identificada |
| **SEC-03** | Sin endpoint ni interfaz para cambio de contraseña de Admin | `apps/server` / `apps/admin` | **ALTA** | Identificada |
| **SEC-04** | Exposición pública del Panel Admin (`/admin`) en el túnel | `deploy/nginx.conf` | **ALTA** | Identificada |
| **SEC-05** | Claves secretas de cifrado y JWT con fallbacks por defecto | `apps/server/utils/crypto.ts` & `jwt.ts` | **MEDIA** | Identificada |
| **SEC-06** | Ausencia de Headers de Seguridad HTTP y Fuga de `X-Powered-By` | `apps/server/index.ts` & `nginx.conf` | **MEDIA** | Identificada |
| **SEC-07** | CORS global irrestricto (`origin: '*'`) en API | `apps/server/index.ts` | **MEDIA** | Identificada |
| **SEC-08** | Límite excesivo en Body Parser (10 MB) susceptible a DoS | `apps/server/index.ts` | **BAJA** | Identificada |
| **SEC-09** | Impresión de contraseñas iniciales en logs del servidor | `apps/server/db/seed.ts` | **BAJA** | Identificada |
| **SEC-10** | Almacenamiento de tokens y credenciales en `localStorage` | `apps/client` & `apps/admin` | **BAJA** (Arquitectural) | Aceptable para Smart TV |

---

## 2. Fortalezas de Seguridad Identificadas (Lo que está BIEN)

1. **Prevención de Inyección SQL (100% Blindado)**:
   - Todo el backend utiliza consultas preparadas (`db.prepare(...)` con parámetros posicionales `?`) provistas por `node:sqlite`. No existe una sola concatenación dinámica de cadenas con entradas del usuario en consultas SQL.
2. **Cifrado Robusto de Credenciales en Reposo**:
   - Las contraseñas de usuarios y administradores se almacenan como hashes criptográficos con `bcryptjs` (salt rounds = 10).
   - Las credenciales sensibles de los proveedores Xtream Codes se cifran con `aes-256-gcm` (cifrado simétrico autenticado con vector de inicialización IV aleatorio de 12 bytes y AuthTag).
3. **Validación de Sesiones en Tiempo Real**:
   - El middleware `requireClient` no solo valida la firma del JWT, sino que consulta la base de datos en cada petición para comprobar si la cuenta fue suspendida o venció, bloqueando accesos no autorizados inmediatamente.
4. **Protección contra XSS en Frontend**:
   - No existe uso de `dangerouslySetInnerHTML`, `innerHTML` ni `eval()` en ningún componente de la aplicación cliente ni del panel de administración. React escapa automáticamente las variables renderizadas en el DOM.
5. **Control Estricto de Concurrencia**:
   - El mecanismo de Heartbeat cada 30 segundos limpia sesiones zombis (> 75s) y limita el número de pantallas simultáneas asignadas por cliente.

---

## 3. Análisis Detallado de Vulnerabilidades

### SEC-01: SSRF (Server-Side Request Forgery) en Subtítulos
- **Severidad:** **CRÍTICA** (CVSS 8.6)
- **Ubicación:** `apps/server/src/controllers/clientController.ts:324` (`downloadSubtitle`)
- **Descripción:** El endpoint público `GET /api/client/subtitles/download?url=...` recibe una URL arbitraria y ejecuta `fetch(targetUrl)` sin verificar si pertenece a un dominio legítimo o si apunta a una dirección IP interna (como `http://127.0.0.1:3001`, `http://192.168.2.244:8006` en Proxmox VE, o servicios internos del contenedor).
- **Riesgo:** Un atacante puede utilizar el servidor backend como intermediario (pivote) para escanear puertos internos, consultar la API de Proxmox o acceder a servicios que no están expuestos al exterior.
- **Remediación:**
  1. Validar que la URL pertenezca exclusivamente al protocolo `https:`.
  2. Implementar una lista blanca de dominios permitidos (ej. `opensubtitles.org`, `*.strem.io`, `api.opensubtitles.com`, `subsource.net`).
  3. Rechazar estrictamente cualquier hostname que resuelva a IPs privadas (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`).

---

### SEC-02: Ausencia de Rate Limiting contra Ataques de Fuerza Bruta
- **Severidad:** **ALTA** (CVSS 7.5)
- **Ubicación:** `apps/server/src/routes/adminRoutes.ts` y `clientRoutes.ts`
- **Descripción:** Ni el login administrativo (`POST /api/admin/login`) ni el login de clientes (`POST /api/client/login`) tienen límite de peticiones. Un atacante puede lanzar miles de solicitudes por minuto probando diccionarios de contraseñas.
- **Remediación:**
  - Instalar e integrar `express-rate-limit`:
    - Límite de 5 intentos fallidos cada 15 minutos por IP para el panel de administración.
    - Límite de 10 intentos cada 15 minutos para clientes.

---

### SEC-03: Sin Mecanismo de Cambio de Contraseña de Administrador
- **Severidad:** **ALTA** (CVSS 7.2)
- **Ubicación:** `apps/server/src/routes/adminRoutes.ts` y `apps/admin/src/App.tsx`
- **Descripción:** Actualmente la plataforma no cuenta con un endpoint ni pantalla para que el administrador pueda cambiar su contraseña. Esto fuerza al usuario a quedarse indefinidamente con la contraseña generada al instalar (`admin1234`), dejando el panel vulnerable si alguien conoce la contraseña inicial.
- **Remediación:**
  1. Crear el endpoint `POST /api/admin/change-password` con verificación de la contraseña anterior y hash de la nueva.
  2. Agregar una pestaña o modal de "Seguridad / Cambiar Contraseña" en el Panel de Administración Web.

---

### SEC-04: Exposición Pública del Panel de Administración en el Túnel
- **Severidad:** **ALTA** (CVSS 7.0)
- **Ubicación:** `deploy/nginx.conf`
- **Descripción:** Tanto la App Cliente (`/`) como el Panel de Administración (`/admin/`) se sirven a través del mismo puerto 80 y quedan expuestos al dominio público del túnel de Cloudflare. Cualquier usuario con el enlace público puede ver la pantalla de login del panel.
- **Remediación:**
  - **Opción A (Recomendada Cloudflare Zero Trust):** Proteger la ruta `/admin*` en el Cloudflare Dashboard con **Cloudflare Access** (autenticación previa por PIN de correo o Google OAuth).
  - **Opción B (Nginx IP Whitelist / Header Secret):** Restringir `/admin/` para que solo responda a la red local (`192.168.2.0/24`) o requiera una cabecera especial.

---

### SEC-05: Secretos Criptográficos con Valores por Defecto Predecibles
- **Severidad:** **MEDIA** (CVSS 6.5)
- **Ubicación:** `apps/server/src/utils/jwt.ts` y `crypto.ts`
- **Descripción:** Si la variable `JWT_SECRET` o `ENCRYPTION_KEY` no se define en `.env`, el código utiliza cadenas por defecto conocidas (`gorotv_super_secret_jwt_key_...`). En producción, esto permitiría a un atacante falsificar tokens JWT válidos.
- **Remediación:**
  - En modo producción (`NODE_ENV === 'production'`), forzar al servidor a detenerse (`process.exit(1)`) si `JWT_SECRET` o `ENCRYPTION_KEY` tienen valores predeterminados o no están definidos.

---

### SEC-06: Falta de Headers de Seguridad HTTP y Ocultación del Servidor
- **Severidad:** **MEDIA** (CVSS 5.3)
- **Ubicación:** `apps/server/src/index.ts` y `deploy/nginx.conf`
- **Descripción:** El servidor responde con la cabecera `X-Powered-By: Express` y carece de cabeceras de protección moderna contra ataques de clickjacking, sniffing de MIME y downgrade de TLS.
- **Remediación:**
  - Desactivar cabecera: `app.disable('x-powered-by')`.
  - Configurar en `nginx.conf`:
    - `X-Frame-Options: SAMEORIGIN` (evita clickjacking).
    - `X-Content-Type-Options: nosniff` (evita interpretación errónea de MIME).
    - `Referrer-Policy: strict-origin-when-cross-origin`.
    - `Permissions-Policy: geolocation=(), camera=(), microphone=()`.

---

### SEC-07: Configuración de CORS Global Irrestricta
- **Severidad:** **MEDIA** (CVSS 5.0)
- **Ubicación:** `apps/server/src/index.ts:15` (`app.use(cors({ origin: '*' }))`)
- **Descripción:** Se permite cualquier origen para todos los endpoints. Si bien las APIs requieren Bearer Token, las rutas de administración no deberían aceptar peticiones originadas desde dominios de terceros.
- **Remediación:**
  - Restringir el origen a los dominios autorizados de la aplicación o al host actual en peticiones que no vengan de apps de TV.

---

### SEC-08: Límite Excesivo de Carga en Body Parser
- **Severidad:** **BAJA** (CVSS 4.0)
- **Ubicación:** `apps/server/src/index.ts:16-17` (`limit: '10mb'`)
- **Descripción:** Se aceptan cuerpos JSON de hasta 10 MB cuando el payload más pesado del sistema (creación de usuario) no supera 2 KB. Un atacante podría enviar peticiones repetitivas de 10 MB saturando la memoria del contenedor LXC.
- **Remediación:** Reducir el límite a `500kb`.

---

### SEC-09: Fuga de Contraseña en Logs de Consola
- **Severidad:** **BAJA** (CVSS 3.3)
- **Ubicación:** `apps/server/src/db/seed.ts:14`
- **Descripción:** `console.log([Seed] Usuario administrador inicial creado: ${adminUser} / ${adminPass})` imprime la contraseña en los logs de Docker / Systemd.
- **Remediación:** Omitir la contraseña en el mensaje de log: `console.log([Seed] Usuario administrador inicial creado: ${adminUser})`.

---

## 4. Plan de Remediación Recomendado (Prioridad de Ejecución)

### Fase 1: Inmediata (Parches de Seguridad Crítica en Código)
1. **Blindar endpoint de subtítulos (SEC-01)**: Validar contra whitelist de dominios y bloquear IPs locales.
2. **Implementar Rate Limiting (SEC-02)**: Instalar `express-rate-limit` protegiendo `/api/admin/login` y `/api/client/login`.
3. **Endpoint y Pantalla de Cambio de Contraseña de Admin (SEC-03)**: Permitir cambiar la clave desde el panel para eliminar `admin1234`.
4. **Endurecer Cabeceras y Parser (SEC-06, SEC-08, SEC-09)**: `app.disable('x-powered-by')`, reducir límite a `500kb` y eliminar log de passwords.

### Fase 2: Configuración de Infraestructura y Acceso
1. **Proteger `/admin` en Cloudflare (SEC-04)** con una regla de Cloudflare Zero Trust (Access).
2. **Generar claves criptográficas aleatorias en el `.env` del LXC (SEC-05)** con `openssl rand -hex 32`.
