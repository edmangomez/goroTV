# Empaquetado para LG Smart TV (webOS) - goroTV

Este directorio contiene la estructura requerida por webOS Open Source Edition y LG webOS TV (webOS 4.0+) para generar un paquete instalable `.ipk`.

## Pasos para Empaquetar e Instalar

1. Edita `index.html` y coloca la URL de tu túnel de Cloudflare:
   ```js
   var HOSTED_URL = 'https://gorotv.tudominio.com';
   ```

2. Empaqueta la app usando la CLI oficial de webOS (`ares-cli`):
   ```bash
   ares-package .
   ```
   Esto generará un archivo `com.gorotv.app_1.0.0_all.ipk`.

3. Instala en tu televisor LG (con Developer Mode app instalada en la TV):
   ```bash
   ares-install com.gorotv.app_1.0.0_all.ipk -d <DISPOSITIVO_LG>
   ```
