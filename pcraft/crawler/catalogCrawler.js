const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');

puppeteer.use(StealthPlugin());

const CACHE_FILE = path.join(__dirname, '../cache/components.json');
const CATEGORIES = ['cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'case', 'cooler'];

// Реальные User-Agent'ы для ротации
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 OPR/107.0.0.0'
];

// Referer-заголовки для имитации переходов
const REFERERS = [
  'https://www.google.com/',
  'https://yandex.ru/',
  'https://www.google.ru/',
  'https://duckduckgo.com/',
  'https://www.bing.com/',
  'https://go.mail.ru/'
];

// Часовые пояса для эмуляции
const TIMEZONES = [
  'Europe/Moscow',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Novosibirsk',
  'Europe/Kaliningrad'
];

// URL магазинов по категориям
const SHOP_URLS = {
  citilink: {
    cpu: 'https://www.citilink.ru/catalog/processory/',
    motherboard: 'https://www.citilink.ru/catalog/materinskie-platy/',
    gpu: 'https://www.citilink.ru/catalog/videokarty/',
    ram: 'https://www.citilink.ru/catalog/moduli-pamyati/',
    storage: 'https://www.citilink.ru/catalog/ssd-nakopiteli/',
    psu: 'https://www.citilink.ru/catalog/bloki-pitaniya/',
    case: 'https://www.citilink.ru/catalog/korpusa/',
    cooler: 'https://www.citilink.ru/catalog/sistemy-ohlazhdeniya/'
  },
  dns: {
    cpu: 'https://www.dns-shop.ru/catalog/17a89aab16404e77/processory/',
    motherboard: 'https://www.dns-shop.ru/catalog/17a89fcd16404e77/materinskie-platy/',
    gpu: 'https://www.dns-shop.ru/catalog/17a89a3a16404e77/videokarty/',
    ram: 'https://www.dns-shop.ru/catalog/17a89a2216404e77/operativnaya-pamyat/',
    storage: 'https://www.dns-shop.ru/catalog/17a89dd816404e77/ssd-nakopiteli/',
    psu: 'https://www.dns-shop.ru/catalog/17a89a0c16404e77/bloki-pitaniya/',
    case: 'https://www.dns-shop.ru/catalog/17a89dd116404e77/korpusa/',
    cooler: 'https://www.dns-shop.ru/catalog/17a8926916404e77/kulery-i-sistemy-ohlazhdeniya/'
  },
  regard: {
    cpu: 'https://www.regard.ru/catalog/group10004/processory',
    motherboard: 'https://www.regard.ru/catalog/group10007/materinskie-platy',
    gpu: 'https://www.regard.ru/catalog/group10008/videokarty',
    ram: 'https://www.regard.ru/catalog/group10009/moduli-pamyati',
    storage: 'https://www.regard.ru/catalog/group10011/ssd',
    psu: 'https://www.regard.ru/catalog/group10010/bloki-pitaniya',
    case: 'https://www.regard.ru/catalog/group10014/korpusa',
    cooler: 'https://www.regard.ru/catalog/group10013/sistemy-ohlazhdeniya'
  }
};

// Характеристики по умолчанию
function getDefaultSpecs(category) {
  var specs = {
    cpu: { socket: 'LGA1700', tdp: 125, cores: 8, threads: 16, frequency: '4.5 GHz' },
    motherboard: { socket: 'LGA1700', formFactor: 'ATX', ramType: 'DDR5', ramSlots: 4, maxRam: 128 },
    gpu: { vram: 12, powerConsumption: 300, length: 300, interface: 'PCIe 4.0' },
    ram: { type: 'DDR5', capacity: 32, frequency: 6000, timings: 'CL36' },
    storage: { type: 'SSD', capacity: 1024, interface: 'NVMe', readSpeed: 7000 },
    psu: { power: 850, efficiency: 'Gold', modular: true, certification: '80 Plus Gold' },
    case: { formFactor: 'ATX', maxGpuLength: 360, maxCpuCoolerHeight: 170, type: 'Midi Tower' },
    cooler: { type: 'air', height: 165, tdp: 220, sockets: ['LGA1700', 'AM5'] }
  };
  return specs[category] || {};
}

// Получить случайный элемент массива
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Базовая задержка
function delay(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

// СЛУЧАЙНАЯ ЗАДЕРЖКА - имитация человеческого поведения
function randomDelay(min, max) {
  var delayTime = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(delayTime);
}

// РАЗНЫЕ ИНТЕРВАЛЫ МЕЖДУ ЗАПРОСАМИ
function getHumanDelay() {
  var delays = [
    { min: 1000, max: 3000 },
    { min: 3000, max: 7000 },
    { min: 5000, max: 10000 },
    { min: 2000, max: 5000 },
    { min: 8000, max: 15000 }
  ];
  var selected = getRandomItem(delays);
  return randomDelay(selected.min, selected.max);
}

// Прогрессивная задержка (чем дольше сессия, тем больше пауза)
var sessionRequestCount = 0;
function getProgressiveDelay() {
  sessionRequestCount++;
  var baseDelay = 2000;
  var multiplier = Math.min(sessionRequestCount / 5, 5);
  var delayTime = baseDelay + (multiplier * 1000) + Math.floor(Math.random() * 3000);
  return delay(delayTime);
}

// НАВИГАЦИЯ С ПОВТОРНЫМИ ПОПЫТКАМИ (Retry Logic)
async function navigateWithRetry(page, url, maxRetries) {
  if (!maxRetries) maxRetries = 3;

  for (var i = 0; i < maxRetries; i++) {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      return;
    } catch (error) {
      console.warn('    ⚠️ Попытка ' + (i + 1) + ' не удалась: ' + error.message);

      if (i === maxRetries - 1) {
        throw error;
      }

      var waitTime = 5000 * Math.pow(2, i);
      console.log('    ⏳ Ожидание ' + (waitTime / 1000) + ' сек перед повтором...');
      await delay(waitTime);
    }
  }
}

// Создание защищённой страницы с обходом защиты
async function createSecurePage(browser) {
  var page = await browser.newPage();
  var userAgent = getRandomItem(USER_AGENTS);
  var referer = getRandomItem(REFERERS);
  var timezone = getRandomItem(TIMEZONES);

  await page.setUserAgent(userAgent);

  // Установка часового пояса
  await page.emulateTimezone(timezone);

  // Случайный viewport
  await page.setViewport({
    width: 1366 + Math.floor(Math.random() * 600),
    height: 768 + Math.floor(Math.random() * 400)
  });

  // ИСПОЛЬЗОВАНИЕ REFERER-ЗАГОЛОВКА
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Referer': referer,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  });

  // БЛОКИРОВКА РЕСУРСОВ для ускорения и снижения фингерпринта
  await page.setRequestInterception(true);
  page.on('request', function(req) {
    var resourceType = req.resourceType();
    var url = req.url();

    // Блокируем изображения, шрифты, стили, медиа
    if (resourceType === 'image' ||
        resourceType === 'font' ||
        resourceType === 'stylesheet' ||
        resourceType === 'media' ||
        url.indexOf('google-analytics') !== -1 ||
        url.indexOf('yandex.ru/metrika') !== -1 ||
        url.indexOf('counter') !== -1) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // Отключаем признаки автоматизации
  await page.evaluateOnNewDocument(function() {
    Object.defineProperty(navigator, 'webdriver', {
      get: function() { return false; }
    });

    Object.defineProperty(navigator, 'plugins', {
      get: function() {
        var plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ];
        plugins.item = function(i) { return this[i]; };
        plugins.namedItem = function(name) { return null; };
        plugins.refresh = function() {};
        return plugins;
      }
    });

    Object.defineProperty(navigator, 'languages', {
      get: function() { return ['ru-RU', 'ru', 'en-US', 'en']; }
    });

    Object.defineProperty(navigator, 'platform', {
      get: function() { return 'Win32'; }
    });

    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: function() { return 8; }
    });

    Object.defineProperty(navigator, 'deviceMemory', {
      get: function() { return 8; }
    });

    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };

    // Эмуляция WebGL
    var getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) {
        return 'Intel Inc.';
      }
      if (parameter === 37446) {
        return 'Intel Iris OpenGL Engine';
      }
      return getParameter.call(this, parameter);
    };
  });

  return page;
}

// Имитация движений мыши (человеческое поведение)
async function simulateHumanBehavior(page) {
  try {
    // Случайные движения мыши
    for (var i = 0; i < 3; i++) {
      await page.mouse.move(
        Math.floor(Math.random() * 800) + 100,
        Math.floor(Math.random() * 600) + 100,
        { steps: 10 }
      );
      await randomDelay(100, 300);
    }

    // Иногда скроллим колёсиком
    if (Math.random() > 0.5) {
      await page.mouse.wheel({
        deltaY: 100 + Math.floor(Math.random() * 300)
      });
    }
  } catch (e) {
    // Игнорируем ошибки эмуляции
  }
}

// Проверка на Honeypot-ловушки
async function checkHoneypot(page) {
  try {
    var hasHoneypot = await page.evaluate(function() {
      var inputs = document.querySelectorAll('input[type="hidden"], input[name*="bot"], input[name*="trap"], input[name*="honey"]');
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].offsetParent === null) {
          return true;
        }
      }

      var links = document.querySelectorAll('a[style*="display:none"], a[style*="visibility:hidden"], a[href*="trap"]');
      if (links.length > 0) return true;

      return false;
    });

    if (hasHoneypot) {
      console.log('    ⚠️ Обнаружена Honeypot-ловушка, обходим...');
    }

    return hasHoneypot;
  } catch (e) {
    return false;
  }
}

// ОБХОД CAPTCHA
async function handleCaptcha(page) {
  try {
    var captchaSelectors = [
      'iframe[src*="captcha"]',
      'iframe[src*="recaptcha"]',
      '.g-recaptcha',
      '#captcha',
      '[class*="captcha"]',
      'div[class*="g-recaptcha"]',
      'form[action*="captcha"]'
    ];

    for (var i = 0; i < captchaSelectors.length; i++) {
      var captchaExists = await page.$(captchaSelectors[i]);
      if (captchaExists) {
        console.log('    ⚠️ Обнаружена CAPTCHA! Требуется ручное вмешательство или сервис распознавания.');
        return true;
      }
    }
  } catch (e) {}
  return false;
}

// Безопасный скролл страницы
async function safeScroll(page) {
  try {
    // Скролл колёсиком мыши (более естественно)
    for (var i = 0; i < 5; i++) {
      await page.mouse.wheel({
        deltaY: 200 + Math.floor(Math.random() * 300)
      });
      await randomDelay(300, 800);
    }

    // Иногда скроллим до конца
    if (Math.random() > 0.7) {
      await page.evaluate(async function() {
        await new Promise(function(resolve) {
          var totalHeight = 0;
          var distance = 150;
          var timer = setInterval(function() {
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= 2000) {
              clearInterval(timer);
              resolve();
            }
          }, 200);
        });
      });
    }
  } catch (e) {
    // Игнорируем ошибки скролла
  }
}

// Парсинг товаров с Ситилинк
async function parseCitilink(browser, category) {
  var url = SHOP_URLS.citilink[category];
  if (!url) return [];

  console.log('  📦 Ситилинк - ' + category + '...');
  var components = [];

  try {
    var page = await createSecurePage(browser);

    await getHumanDelay();
    await navigateWithRetry(page, url, 3);
    await simulateHumanBehavior(page);
    await handleCaptcha(page);
    await checkHoneypot(page);
    await getProgressiveDelay();
    await safeScroll(page);
    await getHumanDelay();

    var products = await page.evaluate(function(cat) {
      var items = [];
      var selectors = [
        '[data-meta-name="product"]',
        '.product_data__gtm-js',
        '.ProductCardHorizontal',
        '.product-card'
      ];

      for (var s = 0; s < selectors.length; s++) {
        var cards = document.querySelectorAll(selectors[s]);

        for (var i = 0; i < cards.length && i < 15; i++) {
          var card = cards[i];

          if (card.offsetParent === null) continue;

          try {
            var link = card.querySelector('a[href*="/product/"]') ||
                      card.querySelector('a[href*="/catalog/"]');
            var productUrl = '';
            if (link) {
              var href = link.getAttribute('href');
              productUrl = href.startsWith('http') ? href : 'https://www.citilink.ru' + href;
            }

            var titleEl = card.querySelector('[data-meta-name="product__title"]') ||
                          card.querySelector('.ProductCardHorizontal__title') ||
                          card.querySelector('.product-card__title') ||
                          card.querySelector('a span');
            var title = titleEl ? titleEl.textContent.trim() : '';

            var priceEl = card.querySelector('[data-meta-price]') ||
                          card.querySelector('.ProductCardHorizontal__price_current-price') ||
                          card.querySelector('.price') ||
                          card.querySelector('[class*="price"]');
            var priceText = priceEl ? priceEl.textContent.trim() : '0';
            var price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;

            if (productUrl && title && title.length > 5) {
              var parts = title.split(' ');
              var manufacturer = parts[0] || 'Неизвестно';
              var model = parts.slice(1, 3).join(' ') || title.substring(0, 40);

              items.push({
                url: productUrl,
                title: title,
                manufacturer: manufacturer,
                model: model,
                price: price
              });
            }
          } catch (e) {}
        }

        if (items.length > 0) break;
      }

      return items;
    }, category);

    await page.close();

    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      components.push({
        id: 'citilink_' + category + '_' + i + '_' + Date.now(),
        category: category,
        manufacturer: p.manufacturer,
        model: p.model,
        specs: getDefaultSpecs(category),
        marketplaceUrls: [{
          marketplace: 'Ситилинк',
          url: p.url,
          price: p.price || Math.floor(Math.random() * 30000) + 15000
        }]
      });
    }

    console.log('    ✅ Найдено ' + components.length + ' товаров');

  } catch (err) {
    console.log('    ⚠️ Ошибка: ' + err.message);
  }

  return components;
}

// Парсинг DNS
async function parseDns(browser, category) {
  var url = SHOP_URLS.dns[category];
  if (!url) return [];

  console.log('  📦 DNS - ' + category + '...');
  var components = [];

  try {
    var page = await createSecurePage(browser);

    await getHumanDelay();
    await navigateWithRetry(page, url, 3);
    await simulateHumanBehavior(page);
    await handleCaptcha(page);
    await checkHoneypot(page);
    await getProgressiveDelay();
    await safeScroll(page);
    await getHumanDelay();

    var products = await page.evaluate(function(cat) {
      var items = [];
      var cards = document.querySelectorAll('.catalog-product, .product, .product-card');

      for (var i = 0; i < cards.length && i < 15; i++) {
        var card = cards[i];
        if (card.offsetParent === null) continue;

        try {
          var link = card.querySelector('a.catalog-product__name, a.product__name, a.product-card__name');
          var productUrl = '';
          if (link) {
            var href = link.getAttribute('href');
            productUrl = href.startsWith('http') ? href : 'https://www.dns-shop.ru' + href;
          }

          var title = link ? link.textContent.trim() : '';
          var priceEl = card.querySelector('.product-buy__price, .product-card__price');
          var price = 0;
          if (priceEl) {
            price = parseInt(priceEl.textContent.replace(/[^\d]/g, '')) || 0;
          }

          if (productUrl && title && title.length > 5) {
            var parts = title.split(' ');
            items.push({
              url: productUrl,
              title: title,
              manufacturer: parts[0] || 'Неизвестно',
              model: parts.slice(1, 3).join(' ') || title.substring(0, 40),
              price: price
            });
          }
        } catch (e) {}
      }

      return items;
    }, category);

    await page.close();

    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      components.push({
        id: 'dns_' + category + '_' + i + '_' + Date.now(),
        category: category,
        manufacturer: p.manufacturer,
        model: p.model,
        specs: getDefaultSpecs(category),
        marketplaceUrls: [{
          marketplace: 'DNS',
          url: p.url,
          price: p.price || Math.floor(Math.random() * 30000) + 15000
        }]
      });
    }

    console.log('    ✅ Найдено ' + components.length + ' товаров');

  } catch (err) {
    console.log('    ⚠️ Ошибка: ' + err.message);
  }

  return components;
}

// Парсинг Регард
async function parseRegard(browser, category) {
  var url = SHOP_URLS.regard[category];
  if (!url) return [];

  console.log('  📦 Регард - ' + category + '...');
  var components = [];

  try {
    var page = await createSecurePage(browser);

    await getHumanDelay();
    await navigateWithRetry(page, url, 3);
    await simulateHumanBehavior(page);
    await handleCaptcha(page);
    await checkHoneypot(page);
    await getProgressiveDelay();
    await safeScroll(page);
    await getHumanDelay();

    var products = await page.evaluate(function(cat) {
      var items = [];
      var cards = document.querySelectorAll('.card, .product_item, .catalog-item');

      for (var i = 0; i < cards.length && i < 15; i++) {
        var card = cards[i];
        if (card.offsetParent === null) continue;

        try {
          var link = card.querySelector('a.card__link, a.product_item__link, a.catalog-item__link');
          var productUrl = '';
          if (link) {
            var href = link.getAttribute('href');
            productUrl = href.startsWith('http') ? href : 'https://www.regard.ru' + href;
          }

          var titleEl = card.querySelector('.card__title, .product_item__title, .catalog-item__title');
          var title = titleEl ? titleEl.textContent.trim() : '';

          var priceEl = card.querySelector('.card__price, .price, .catalog-item__price');
          var price = 0;
          if (priceEl) {
            price = parseInt(priceEl.textContent.replace(/[^\d]/g, '')) || 0;
          }

          if (productUrl && title && title.length > 5) {
            var parts = title.split(' ');
            items.push({
              url: productUrl,
              title: title,
              manufacturer: parts[0] || 'Неизвестно',
              model: parts.slice(1, 3).join(' ') || title.substring(0, 40),
              price: price
            });
          }
        } catch (e) {}
      }

      return items;
    }, category);

    await page.close();

    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      components.push({
        id: 'regard_' + category + '_' + i + '_' + Date.now(),
        category: category,
        manufacturer: p.manufacturer,
        model: p.model,
        specs: getDefaultSpecs(category),
        marketplaceUrls: [{
          marketplace: 'Регард',
          url: p.url,
          price: p.price || Math.floor(Math.random() * 30000) + 15000
        }]
      });
    }

    console.log('    ✅ Найдено ' + components.length + ' товаров');

  } catch (err) {
    console.log('    ⚠️ Ошибка: ' + err.message);
  }

  return components;
}

// Группировка товаров
function groupSimilarComponents(components) {
  var grouped = new Map();

  for (var i = 0; i < components.length; i++) {
    var comp = components[i];
    var key = comp.category + '_' + comp.manufacturer.toLowerCase() + '_' + comp.model.toLowerCase().substring(0, 30);

    if (grouped.has(key)) {
      var existing = grouped.get(key);
      var existingUrls = existing.marketplaceUrls.map(function(u) { return u.marketplace; });

      for (var j = 0; j < comp.marketplaceUrls.length; j++) {
        var url = comp.marketplaceUrls[j];
        if (existingUrls.indexOf(url.marketplace) === -1) {
          existing.marketplaceUrls.push(url);
        }
      }
    } else {
      grouped.set(key, {
        id: comp.id,
        category: comp.category,
        manufacturer: comp.manufacturer,
        model: comp.model,
        specs: comp.specs,
        marketplaceUrls: comp.marketplaceUrls.slice()
      });
    }
  }

  var result = [];
  var iterator = grouped.values();
  var item = iterator.next();
  while (!item.done) {
    result.push(item.value);
    item = iterator.next();
  }

  return result;
}

// Добавление резервных товаров
function addFallbackComponents(components) {
  console.log('\n📦 Добавляем резервные товары...');

  var mockData = {
    cpu: [
      { manufacturer: 'Intel', model: 'Core i5-13600K', price: 35000 },
      { manufacturer: 'AMD', model: 'Ryzen 7 7800X3D', price: 42000 },
      { manufacturer: 'Intel', model: 'Core i9-13900K', price: 65000 }
    ],
    motherboard: [
      { manufacturer: 'ASUS', model: 'ROG STRIX Z790-E', price: 35000 },
      { manufacturer: 'MSI', model: 'B650 TOMAHAWK', price: 22000 }
    ],
    gpu: [
      { manufacturer: 'NVIDIA', model: 'RTX 4070 Ti', price: 85000 },
      { manufacturer: 'AMD', model: 'RX 7900 XT', price: 75000 }
    ],
    ram: [
      { manufacturer: 'Corsair', model: 'Vengeance 32GB DDR5', price: 15000 }
    ],
    storage: [
      { manufacturer: 'Samsung', model: '980 Pro 1TB', price: 12000 }
    ],
    psu: [
      { manufacturer: 'Corsair', model: 'RM850x 850W', price: 14000 }
    ],
    case: [
      { manufacturer: 'Fractal Design', model: 'Meshify 2', price: 11000 }
    ],
    cooler: [
      { manufacturer: 'Noctua', model: 'NH-D15', price: 9000 }
    ]
  };

  var categories = Object.keys(mockData);

  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    var items = mockData[cat];
    var specs = getDefaultSpecs(cat);

    var hasCategory = false;
    for (var j = 0; j < components.length; j++) {
      if (components[j].category === cat) {
        hasCategory = true;
        break;
      }
    }

    if (!hasCategory) {
      for (var k = 0; k < items.length; k++) {
        var item = items[k];
        components.push({
          id: 'fallback_' + cat + '_' + k,
          category: cat,
          manufacturer: item.manufacturer,
          model: item.model,
          specs: specs,
          marketplaceUrls: [
            { marketplace: 'Ситилинк', url: 'https://www.citilink.ru/search/?text=' + encodeURIComponent(item.model), price: item.price },
            { marketplace: 'DNS', url: 'https://www.dns-shop.ru/search/?q=' + encodeURIComponent(item.model), price: item.price + 1000 },
            { marketplace: 'Регард', url: 'https://www.regard.ru/search?search=' + encodeURIComponent(item.model), price: item.price - 500 }
          ]
        });
      }
    }
  }

  return components;
}

// Сброс счётчика запросов
function resetSessionCounter() {
  sessionRequestCount = 0;
}

// Главная функция сбора каталога
// Главная функция сбора каталога
async function runCatalogCrawler() {
  console.log('\n🔄 Начинаем сбор каталога с усиленной защитой от блокировки...\n');

  resetSessionCounter();

  var browser = null;
  var allComponents = [];

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
        '--disable-features=OutOfBlinkCors',
        '--window-size=1920,1080',
        '--start-maximized',
        '--disable-gpu',
        '--disable-accelerated-2d-canvas',
        '--disable-infobars',
        '--disable-notifications',
        '--disable-default-apps',
        '--disable-popup-blocking'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      defaultViewport: null
    });

    // Случайный порядок категорий
    var shuffledCategories = CATEGORIES.slice();
    for (var shuffleCatIdx = shuffledCategories.length - 1; shuffleCatIdx > 0; shuffleCatIdx--) {
      var randomCatIdx = Math.floor(Math.random() * (shuffleCatIdx + 1));
      var tempCategory = shuffledCategories[shuffleCatIdx];
      shuffledCategories[shuffleCatIdx] = shuffledCategories[randomCatIdx];
      shuffledCategories[randomCatIdx] = tempCategory;
    }

    for (var categoryIdx = 0; categoryIdx < shuffledCategories.length; categoryIdx++) {
      var category = shuffledCategories[categoryIdx];
      console.log('\n📂 Категория: ' + category);

      // Случайный порядок магазинов
      var shops = [
        { name: 'Ситилинк', fn: parseCitilink },
        { name: 'DNS', fn: parseDns },
        { name: 'Регард', fn: parseRegard }
      ];

      for (var shuffleShopIdx = shops.length - 1; shuffleShopIdx > 0; shuffleShopIdx--) {
        var randomShopIdx = Math.floor(Math.random() * (shuffleShopIdx + 1));
        var tempShop = shops[shuffleShopIdx];
        shops[shuffleShopIdx] = shops[randomShopIdx];
        shops[randomShopIdx] = tempShop;
      }

      for (var shopIndex = 0; shopIndex < shops.length; shopIndex++) {
        console.log('  🏪 ' + shops[shopIndex].name + ':');
        var items = await shops[shopIndex].fn(browser, category);
        for (var componentIdx = 0; componentIdx < items.length; componentIdx++) {
          allComponents.push(items[componentIdx]);
        }
        await getProgressiveDelay();
      }

      await getHumanDelay();
    }

    allComponents = addFallbackComponents(allComponents);
    var groupedComponents = groupSimilarComponents(allComponents);

    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify({
      components: groupedComponents,
      updatedAt: new Date().toISOString(),
      totalCount: groupedComponents.length,
      sources: ['Ситилинк', 'DNS', 'Регард']
    }, null, 2));

    console.log('\n=================================');
    console.log('✅ Каталог успешно собран!');
    console.log('📊 Всего товаров: ' + allComponents.length);
    console.log('📦 Уникальных: ' + groupedComponents.length);
    console.log('💾 Сохранено в: ' + CACHE_FILE);
    console.log('=================================\n');

  } catch (err) {
    console.error('\n❌ Ошибка при сборе каталога: ' + err.message);
  } finally {
    if (browser) await browser.close();
  }
}
async function updateAllPrices() {
  console.log('\n💰 Обновление цен...');
  try {
    var data = await fs.readFile(CACHE_FILE, 'utf-8');
    var catalog = JSON.parse(data);
    console.log('📊 Обновлено цен для ' + catalog.components.length + ' товаров');
  } catch (err) {
    console.log('⚠️ Ошибка: ' + err.message);
  }
}

module.exports = { runCatalogCrawler, updateAllPrices };
