# Empaquetado para Android TV y Fire TV (goroTV)

Este directorio contiene la configuración de **Capacitor** para compilar la aplicación como Hosted Web App en dispositivos Android TV y Amazon Fire TV.

## ¿Cómo compilar el APK?

1. Configura en `capacitor.config.ts` la URL pública de tu túnel de Cloudflare:
   ```ts
   url: 'https://gorotv.tudominio.com'
   ```

2. Inicializa el proyecto Android con Capacitor:
   ```bash
   npx cap add android
   ```

3. Copia el archivo `AndroidManifest.xml` de esta carpeta a `android/app/src/main/AndroidManifest.xml`.

4. Abre el proyecto en Android Studio:
   ```bash
   npx cap open android
   ```

5. Genera el APK firmado (`Build > Build Bundle(s) / APK(s) > Build APK(s)`).

6. Instala el APK en tu Android TV o Fire TV mediante ADB o la app **Downloader**.
