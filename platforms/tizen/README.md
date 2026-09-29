# Empaquetado para Samsung Smart TV (Tizen) - goroTV

Este directorio contiene los archivos necesarios para compilar un paquete `.wgt` para instalar en televisores Samsung Smart TV (Tizen OS 4.0+).

## Pasos para Empaquetar e Instalar

1. Edita `index.html` y coloca la URL de tu túnel de Cloudflare:
   ```js
   var HOSTED_URL = 'https://gorotv.tudominio.com';
   ```

2. Abre **Tizen Studio** o utiliza la CLI de Tizen:
   ```bash
   tizen package -t wgt -s MiCertificado -- .
   ```

3. Instala en tu televisor Samsung (con Modo Desarrollador activado en la TV):
   ```bash
   tizen install -n goroTV.wgt -t <IP_DE_TU_SAMSUNG_TV>
   ```

4. La aplicación cargará la versión siempre actualizada de tu Proxmox LXC sin requerir reinstalaciones futuras.
