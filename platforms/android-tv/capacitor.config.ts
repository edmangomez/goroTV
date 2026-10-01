import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gorotv.app',
  appName: 'goroTV',
  webDir: 'www',
  server: {
    // Hosted Web App conectada a goroTV
    url: process.env.GOROTV_HOSTED_URL || 'http://tv.gorofamily.com',
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
