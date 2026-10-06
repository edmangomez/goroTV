const { app, BrowserWindow, Menu, globalShortcut, session } = require('electron');
const path = require('path');

let mainWindow = null;
const DEFAULT_URL = process.env.GOROTV_URL || 'https://tv.gorofamily.com';

// Solo permitir una única instancia de la aplicación
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#0D1117',
    icon: iconPath,
    title: 'goroTV Player',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Desactivar webSecurity y permitir contenido mixto para streaming directo IPTV sin restricciones CORS
      webSecurity: false,
      allowRunningInsecureContent: true,
      backgroundThrottling: false,
    },
  });

  // Modificar encabezados HTTP para evitar bloqueos de proveedores IPTV
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    // Si la petición es hacia un proveedor de streaming o recursos multimedia
    details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    callback({ requestHeaders: details.requestHeaders });
  });

  // Configuración de menú mínimo
  const template = [
    {
      label: 'Ver',
      submenu: [
        {
          label: 'Pantalla Completa',
          accelerator: 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          },
        },
        {
          label: 'Recargar',
          accelerator: 'F5',
          click: () => {
            mainWindow.reload();
          },
        },
        { type: 'separator' },
        {
          label: 'Herramientas de Desarrollador',
          accelerator: 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    },
    {
      label: 'Navegación',
      submenu: [
        {
          label: 'Ir a Inicio',
          accelerator: 'Alt+Home',
          click: () => {
            mainWindow.loadURL(DEFAULT_URL);
          },
        },
        {
          label: 'Landing Page & Descargas',
          click: () => {
            mainWindow.loadURL(`${DEFAULT_URL}/iptv-player`);
          },
        },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de goroTV',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'goroTV Player para Windows',
              message: 'goroTV Player v1.0.0',
              detail: 'Solución IPTV Multiplataforma con streaming directo.\nSoporte: support@gorofamily.com',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Cargar URL oficial
  mainWindow.loadURL(DEFAULT_URL);

  // Manejar fallo de carga con pantalla amigable de reintento
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    // Código -3 es ABORTED (normal durante redirecciones), ignorar
    if (errorCode === -3) return;

    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>goroTV - Error de Conexión</title>
        <style>
          body {
            background-color: #0D1117;
            color: #F8FAFC;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          h1 { color: #00D4FF; margin-bottom: 8px; font-size: 28px; }
          p { color: #94A3B8; max-width: 480px; margin-bottom: 24px; line-height: 1.5; }
          button {
            background: #00D4FF;
            color: #0D1117;
            border: none;
            padding: 12px 28px;
            font-size: 16px;
            font-weight: bold;
            border-radius: 8px;
            cursor: pointer;
            transition: opacity 0.2s;
          }
          button:hover { opacity: 0.9; }
        </style>
      </head>
      <body>
        <h1>No se pudo conectar a goroTV</h1>
        <p>Verifica tu conexión a Internet o que el servidor ${DEFAULT_URL} esté accesible.</p>
        <button onclick="window.location.href = '${DEFAULT_URL}'">Reintentar Conexión</button>
      </body>
      </html>
    `)}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
