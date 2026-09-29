# Guía de Despliegue en Proxmox VE (LXC) con Cloudflare Tunnel

Esta guía describe el procedimiento para desplegar el ecosistema **goroTV** de forma permanente (24/7) en tu servidor Proxmox VE mediante un contenedor LXC ligero y seguro.

---

## 1. Requisitos Previos

1. **Acceso SSH a tu Servidor Proxmox VE**:
   - Dirección IP de tu nodo Proxmox (ej. `192.168.1.100` o dominio).
   - Usuario: `root` (o usuario con privilegios sudo).
   - Contraseña o Llave SSH.
2. **Cuenta de Cloudflare y Dominio**:
   - Tu dominio gestionado en Cloudflare (ej. `midominio.com`).
   - Un túnel creado en Cloudflare Zero Trust (gratuito).

---

## 2. Cómo Obtener el Token del Túnel de Cloudflare (2 minutos)

1. Ingresa a [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2. Ve a **Networks** > **Tunnels** > Haz clic en **Create a Tunnel**.
3. Elige el conector **Cloudflared** y ponle de nombre `gorotv-tunnel`.
4. En la pantalla siguiente, selecciona la pestaña **Docker**.
5. Verás un comando que termina con:
   ```bash
   cloudflared tunnel run --token eyJh...
   ```
   Copia únicamente el token largo que empieza con `eyJh...`.
6. En la pestaña **Public Hostname**:
   - **Subdomain**: `gorotv` (o el que gustes, ej. `iptv`, `app`).
   - **Domain**: Selecciona tu dominio (ej. `midominio.com`).
   - **Type**: `HTTP`
   - **URL**: `web:80` (el servicio Nginx de goroTV en la red Docker).
7. Guarda el túnel.

---

## 3. Despliegue Automático con `proxmox-setup.sh`

Cuando estés listo para darme las credenciales SSH de tu servidor Proxmox, realizaremos los siguientes comandos:

### Paso A: Subir el script al nodo Proxmox
```bash
scp deploy/proxmox-setup.sh root@<IP_PROXMOX>:/root/
```

### Paso B: Ejecutar el aprovisionador en Proxmox
```bash
ssh root@<IP_PROXMOX>
chmod +x /root/proxmox-setup.sh
/root/proxmox-setup.sh 200 local-lvm 1024 512 2 12G
```
*Este comando crea un contenedor LXC Debian 12 con ID 200, instala Docker y prepara `/opt/gorotv`.*

### Paso C: Transferir el proyecto goroTV al LXC
```bash
# Desde tu máquina local:
scp -r ./* root@<IP_DEL_LXC>:/opt/gorotv/
```

### Paso D: Configurar variables y levantar servicios
```bash
# Entrar al contenedor:
pct enter 200
cd /opt/gorotv

# Crear archivo .env de producción
cat << 'EOF' > .env
PORT=3001
NODE_ENV=production
JWT_SECRET=super_secreto_generado_2026_gorotv
ENCRYPTION_KEY=gorotv_aes256_clave_32_caracteres!
CLOUDFLARE_TUNNEL_TOKEN=TU_TOKEN_DE_CLOUDFLARE_AQUI
EOF

# Levantar todos los contenedores
docker compose -f deploy/docker-compose.yml up -d --build
```

---

## 4. URLs de Acceso una vez Levantado

- **App Cliente IPTV (Web, TV y Móvil)**: `https://gorotv.tudominio.com/`
- **Panel Administrativo**: `https://gorotv.tudominio.com/admin`
- **API Health Check**: `https://gorotv.tudominio.com/api/health`

### Credenciales iniciales del Panel Admin:
- **Usuario**: `admin`
- **Contraseña**: `admin1234` (recomendado cambiarla o configurarla al gusto en la base de datos).

---

## 5. Mantenimiento y Respaldos

- La base de datos SQLite se almacena en el volumen persistente `gorotv_sqlite_data`.
- Para hacer un respaldo inmediato desde Proxmox VE:
  ```bash
  vzdump 200 --mode snapshot --compress zstd --storage local
  ```
- El contenedor consume menos de **150 MB de memoria RAM**, ideal para servidores Proxmox domésticos o en VPS.
