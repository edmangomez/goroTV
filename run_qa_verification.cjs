const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const VIEWPORT = {
  width: 428,
  height: 926,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
};

const OUTPUT_DIR = 'C:\\Users\\edman\\.gemini\\antigravity\\brain\\d400c68b-d000-4c9d-ba24-7e06ddf85d19';
const ADMIN_SCREENSHOT = path.join(OUTPUT_DIR, 'admin_mobile_dashboard.png');
const CLIENT_SCREENSHOT = path.join(OUTPUT_DIR, 'client_mobile_pwa.png');

async function run() {
  console.log('Iniciando prueba de automatización QA...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=428,926'
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent(IPHONE_UA);
  await page.setViewport(VIEWPORT);

  const results = {
    admin: {},
    client: {}
  };

  try {
    // ---------------------------------------------------------
    // 1. ADMIN DASHBOARD
    // ---------------------------------------------------------
    console.log('Navegando a http://192.168.2.240/admin/ ...');
    await page.goto('http://192.168.2.240/admin/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Check if login needed
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      console.log('Pantalla de login detectada. Ingresando credenciales admin / admin1234...');
      await page.type('input[type="text"]', 'admin');
      await page.type('input[type="password"]', 'admin1234');
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
      ]);
      await new Promise(r => setTimeout(r, 2000));
    } else {
      console.log('Sesión ya iniciada o login no requerido.');
    }

    // Esperar a que cargue el dashboard
    await page.waitForSelector('header', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    console.log('Verificando Navbar en 2 niveles...');
    const navbarCheck = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return { found: false };

      // Nivel 1: Top bar
      const brand = header.textContent.includes('goroTV') && header.textContent.includes('Admin');
      const liveBadge = header.querySelector('.bg-emerald-500\\/10') !== null;
      const securityBtn = header.querySelector('button[title*="Seguridad"]') !== null || 
                          Array.from(header.querySelectorAll('button')).some(b => b.textContent.includes('Seguridad'));
      const logoutBtn = header.querySelector('button[title*="Cerrar"]') !== null ||
                        Array.from(header.querySelectorAll('button')).some(b => b.title && b.title.includes('Sesión'));

      // Nivel 2: Fila inferior (tabs móviles)
      const mobileNav = header.querySelector('.md\\:hidden');
      const hasClientsBtn = mobileNav && mobileNav.textContent.includes('Clientes & Tiempo');
      const hasProvidersBtn = mobileNav && mobileNav.textContent.includes('Proveedores Xtream');

      // Overflow check
      const docWidth = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const headerScrollWidth = header.scrollWidth;
      const headerClientWidth = header.clientWidth;

      return {
        found: true,
        brand,
        liveBadge,
        securityBtn,
        logoutBtn,
        hasMobileNav: !!mobileNav,
        hasClientsBtn,
        hasProvidersBtn,
        noHorizontalOverflow: scrollWidth <= docWidth + 1,
        headerNoOverflow: headerScrollWidth <= headerClientWidth + 1
      };
    });
    console.log('Navbar Check:', navbarCheck);
    results.admin.navbar = navbarCheck;

    // 3. Comprobar que las tarjetas de métricas sean compactas
    console.log('Verificando tarjetas de métricas...');
    const statsCheck = await page.evaluate(() => {
      const statsGrid = document.querySelector('.grid.grid-cols-2');
      if (!statsGrid) return { found: false };
      const cards = statsGrid.children;
      return {
        found: true,
        cardsCount: cards.length,
        isGridCols2: statsGrid.classList.contains('grid-cols-2'),
        sampleTitles: Array.from(cards).map(c => c.querySelector('span')?.textContent || '')
      };
    });
    console.log('Stats Check:', statsCheck);
    results.admin.stats = statsCheck;

    // 4. Comprobar lista de clientes como tarjetas táctiles
    console.log('Verificando lista de clientes táctil...');
    const clientsCheck = await page.evaluate(() => {
      const mobileCardsContainer = document.querySelector('.block.md\\:hidden.p-3');
      if (!mobileCardsContainer) {
        // alternativo
        const allMobileViews = document.querySelectorAll('.md\\:hidden');
        return { found: false, allMobileViewsCount: allMobileViews.length };
      }
      const cards = mobileCardsContainer.querySelectorAll('.rounded-2xl.p-4');
      if (cards.length === 0) {
        return { found: true, cardsCount: 0, emptyMessage: mobileCardsContainer.textContent.trim() };
      }

      const firstCard = cards[0];
      const hasUsername = !!firstCard.querySelector('h3');
      const hasStatus = firstCard.textContent.includes('Activo') || firstCard.textContent.includes('Suspendido');
      const hasScreens = firstCard.textContent.includes('Pantallas en vivo');
      const hasExpiration = firstCard.textContent.includes('Vencimiento');
      const hasRenewBtn = Array.from(firstCard.querySelectorAll('button')).some(b => b.textContent.includes('Renovar'));
      const hasEditBtn = Array.from(firstCard.querySelectorAll('button')).some(b => b.textContent.includes('Editar'));
      const hasDeleteBtn = !!firstCard.querySelector('button[title*="Eliminar"]');

      return {
        found: true,
        cardsCount: cards.length,
        sampleCard: {
          username: firstCard.querySelector('h3')?.textContent,
          hasStatus,
          hasScreens,
          hasExpiration,
          hasRenewBtn,
          hasEditBtn,
          hasDeleteBtn
        }
      };
    });
    console.log('Clients Check:', clientsCheck);
    results.admin.clients = clientsCheck;

    // 5. Captura de pantalla completa del panel administrativo
    console.log(`Guardando captura en ${ADMIN_SCREENSHOT}...`);
    await page.screenshot({
      path: ADMIN_SCREENSHOT,
      fullPage: true
    });
    console.log('Captura de admin guardada con éxito.');
    results.admin.screenshot = ADMIN_SCREENSHOT;

    // ---------------------------------------------------------
    // 6. CLIENT PWA APP
    // ---------------------------------------------------------
    console.log('Navegando a http://192.168.2.240/ (App Cliente IPTV)...');
    await page.goto('http://192.168.2.240/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Asegurar que localStorage no tenga el dismiss
    await page.evaluate(() => {
      localStorage.removeItem('gorotv_ios_install_dismissed');
    });

    console.log('Esperando 3.5 segundos para la aparición del IosInstallPrompt...');
    await new Promise(r => setTimeout(r, 3500));

    const pwaCheck = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasTitle = text.includes('Instalar goroTV');
      const hasShare = text.includes('Compartir');
      const hasAddHome = text.includes('Agregar a inicio');
      const promptEl = Array.from(document.querySelectorAll('div')).find(d => 
        d.textContent.includes('Instalar goroTV') && d.textContent.includes('Agregar a inicio')
      );

      return {
        hasTitle,
        hasShare,
        hasAddHome,
        promptVisible: !!promptEl
      };
    });
    console.log('PWA Check:', pwaCheck);
    results.client.pwa = pwaCheck;

    // 7. Captura de pantalla del cliente
    console.log(`Guardando captura de cliente en ${CLIENT_SCREENSHOT}...`);
    await page.screenshot({
      path: CLIENT_SCREENSHOT,
      fullPage: false // Captura de viewport como en un iPhone
    });
    console.log('Captura de cliente guardada con éxito.');
    results.client.screenshot = CLIENT_SCREENSHOT;

  } catch (err) {
    console.error('Error durante la ejecución de QA:', err);
    results.error = err.message;
  } finally {
    await browser.close();
  }

  console.log('RESULTADOS FINALES:');
  console.log(JSON.stringify(results, null, 2));
}

run();
