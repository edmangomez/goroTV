import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gorotv.app',
  appName: 'goroTV',
  webDir: 'dist',
  server: {
    // Hosted Web App: Reemplaza con la URL de tu túnel de Cloudflare
    // ej: https://gorotv.tudominio.com
    url: process.env.GOROTV_HOSTED_URL || 'https://gorotv.tudominio.com',
    cleartext: true, // Permite streams de video HTTP de proveedores sin bloqueo
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
