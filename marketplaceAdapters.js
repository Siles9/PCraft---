/**
 * Модуль адаптеров маркетплейсов для веб‑сайта PCraft.
 * Соответствует диаграмме классов и функциональным требованиям.
 */

// ====================== Работа с ключами ======================
const STORAGE_KEYS = {
    WILDBERRIES: 'pcraft_api_wildberries',
    OZON_CLIENT_ID: 'pcraft_api_ozon_client_id',
    OZON_API_KEY: 'pcraft_api_ozon_api_key',
    YANDEX_MARKET: 'pcraft_api_yandex_market',
};

/**
 * Сохранить ключи пользователя в localStorage.
 */
export function saveApiKeys(wildberriesKey, ozonClientId, ozonApiKey, yandexMarketKey) {
    if (wildberriesKey) localStorage.setItem(STORAGE_KEYS.WILDBERRIES, wildberriesKey);
    if (ozonClientId) localStorage.setItem(STORAGE_KEYS.OZON_CLIENT_ID, ozonClientId);
    if (ozonApiKey) localStorage.setItem(STORAGE_KEYS.OZON_API_KEY, ozonApiKey);
    if (yandexMarketKey) localStorage.setItem(STORAGE_KEYS.YANDEX_MARKET, yandexMarketKey);
}

/**
 * Загрузить сохранённые ключи из localStorage.
 */
export function loadApiKeys() {
    return {
        wildberries: localStorage.getItem(STORAGE_KEYS.WILDBERRIES) || '',
        ozonClientId: localStorage.getItem(STORAGE_KEYS.OZON_CLIENT_ID) || '',
        ozonApiKey: localStorage.getItem(STORAGE_KEYS.OZON_API_KEY) || '',
        yandexMarket: localStorage.getItem(STORAGE_KEYS.YANDEX_MARKET) || '',
    };
}

/**
 * Удалить все ключи (при выходе пользователя или по запросу).
 */
export function clearApiKeys() {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}

// ====================== Конфигурация API ======================
// Базовые URL (могут быть изменены при необходимости)
const API_URLS = {
    wildberries: 'https://content-api.wildberries.ru',
    ozon: 'https://api-seller.ozon.ru/v3',
    yandexMarket: 'https://api.partner.market.yandex.ru/v2',
};

const DEFAULT_TIMEOUT = 5000; // 5 секунд

// ====================== Вспомогательные функции ======================
function fetchWithTimeout(url, options, timeoutMs = DEFAULT_TIMEOUT) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs} ms`)), timeoutMs)
        ),
    ]);
}

function setCache(key, data) {
    try {
        sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {
        console.warn('Кэширование не удалось:', e);
    }
}

function getCache(key, maxAgeMs = 300000) {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;
    try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > maxAgeMs) {
            sessionStorage.removeItem(key);
            return null;
        }
        return data;
    } catch (e) {
        return null;
    }
}

// ====================== Классы модели ======================
export class Offer {
    constructor(marketplace, price, availability, deliveryDays, sellerRating, url) {
        this.marketplace = marketplace;   // строка
        this.price = price;               // число
        this.availability = availability; // boolean
        this.deliveryDays = deliveryDays; // число
        this.sellerRating = sellerRating; // число (0-5)
        this.url = url;                   // строка
    }
}

export class MarketplaceAdapter {
    constructor(name) {
        this.name = name;
    }

    /**
     * Получить актуальные цены для компонента.
     * @param {string} componentId - идентификатор компонента (артикул, SKU)
     * @returns {Promise<Offer[]>}
     */
    async fetchPrices(componentId) {
        throw new Error('Метод fetchPrices должен быть переопределён в наследнике');
    }

    /**
     * Разобрать ответ от API в массив Offer.
     * @param {any} response
     * @returns {Offer[]}
     */
    parseResponse(response) {
        throw new Error('Метод parseResponse должен быть переопределён в наследнике');
    }
}

// ====================== Адаптеры ======================

/**
 * Адаптер Wildberries.
 * Использует API-ключ, введённый пользователем.
 */
export class WildberriesAdapter extends MarketplaceAdapter {
    constructor() {
        super('Wildberries');
    }

    async fetchPrices(componentId) {
        const keys = loadApiKeys();
        if (!keys.wildberries) {
            console.warn('Wildberries: API-ключ не задан. Пожалуйста, введите ключ в настройках.');
            return [];
        }

        const cacheKey = `wb_${componentId}`;
        const cached = getCache(cacheKey);
        if (cached) return cached;

        try {
            // Пример запроса к content-api (поиск карточки товара по артикулу)
            const url = `${API_URLS.wildberries}/content/v2/cards/${componentId}`;
            const response = await fetchWithTimeout(url, {
                headers: {
                    'Authorization': keys.wildberries,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const offers = this.parseResponse(data);
            setCache(cacheKey, offers);
            return offers;
        } catch (error) {
            console.error('Wildberries error:', error);
            return [];
        }
    }

    parseResponse(data) {
        const offers = [];
        // Предполагаемая структура ответа: { cards: [...] }
        const cards = data.cards || [];
        for (const card of cards) {
            offers.push(new Offer(
                this.name,
                card.price || card.sizes?.[0]?.price?.total,
                (card.stock || 0) > 0,
                card.deliveryDays || 3,
                card.sellerRating || 4.5,
                `https://www.wildberries.ru/catalog/${card.nmID}/detail.aspx`
            ));
        }
        return offers;
    }
}

/**
 * Адаптер Ozon.
 * Использует Client-Id и Api-Key, введённые пользователем.
 */
export class OzonAdapter extends MarketplaceAdapter {
    constructor() {
        super('Ozon');
    }

    async fetchPrices(componentId) {
        const keys = loadApiKeys();
        if (!keys.ozonClientId || !keys.ozonApiKey) {
            console.warn('Ozon: Client-Id или Api-Key не заданы. Пожалуйста, введите ключи в настройках.');
            return [];
        }

        const cacheKey = `oz_${componentId}`;
        const cached = getCache(cacheKey);
        if (cached) return cached;

        try {
            const url = `${API_URLS.ozon}/product/info`;
            const response = await fetchWithTimeout(url, {
                method: 'POST',
                headers: {
                    'Client-Id': keys.ozonClientId,
                    'Api-Key': keys.ozonApiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ offer_id: componentId }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const offers = this.parseResponse(data);
            setCache(cacheKey, offers);
            return offers;
        } catch (error) {
            console.error('Ozon error:', error);
            return [];
        }
    }

    parseResponse(data) {
        const offers = [];
        const product = data.result;
        if (product && product.price) {
            offers.push(new Offer(
                this.name,
                product.price,
                product.stock > 0,
                product.delivery_days || 2,
                product.seller_rating || 4.5,
                `https://www.ozon.ru/product/${product.offer_id}`
            ));
        }
        return offers;
    }
}

/**
 * Адаптер Яндекс.Маркет.
 * Использует API-Key (рекомендуется) или OAuth-токен.
 */
export class YandexMarketAdapter extends MarketplaceAdapter {
    constructor() {
        super('Яндекс.Маркет');
    }

    async fetchPrices(componentId) {
        const keys = loadApiKeys();
        if (!keys.yandexMarket) {
            console.warn('Яндекс.Маркет: API-ключ не задан. Пожалуйста, введите ключ в настройках.');
            return [];
        }

        const cacheKey = `ym_${componentId}`;
        const cached = getCache(cacheKey);
        if (cached) return cached;

        try {
            // Используем API-Key (рекомендуемый метод)
            const url = `${API_URLS.yandexMarket}/campaigns/${componentId}`; // уточните эндпоинт
            const response = await fetchWithTimeout(url, {
                headers: {
                    'Api-Key': keys.yandexMarket,
                },
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const offers = this.parseResponse(data);
            setCache(cacheKey, offers);
            return offers;
        } catch (error) {
            console.error('Yandex.Market error:', error);
            return [];
        }
    }

    parseResponse(data) {
        const offers = [];
        // Предполагаемая структура ответа
        const item = data.campaign || data.offer;
        if (item && item.price) {
            offers.push(new Offer(
                this.name,
                item.price,
                item.inStock === true,
                item.deliveryDays || 3,
                item.sellerRating || 4.5,
                `https://market.yandex.ru/product/${item.id}`
            ));
        }
        return offers;
    }
}

/**
 * Адаптер DNS (без публичного API – возвращает пустой массив).
 */
export class DNSAdapter extends MarketplaceAdapter {
    constructor() {
        super('DNS');
    }

    async fetchPrices(componentId) {
        console.warn('DNS: публичное API отсутствует. Для получения данных требуется прокси-сервер.');
        return [];
    }
}

/**
 * Адаптер Citilink (без публичного API – возвращает пустой массив).
 */
export class CitilinkAdapter extends MarketplaceAdapter {
    constructor() {
        super('Citilink');
    }

    async fetchPrices(componentId) {
        console.warn('Citilink: публичное API отсутствует. Для получения данных требуется прокси-сервер.');
        return [];
    }
}

// ====================== Экспорт всех адаптеров и вспомогательных функций ======================
const adapters = [
    new WildberriesAdapter(),
    new OzonAdapter(),
    new YandexMarketAdapter(),
    new DNSAdapter(),
    new CitilinkAdapter(),
];

/**
 * Получить все предложения для компонента от всех активных адаптеров.
 * @param {string} componentId
 * @returns {Promise<Offer[]>}
 */
export async function fetchAllOffers(componentId) {
    const results = await Promise.allSettled(
        adapters.map(adapter => adapter.fetchPrices(componentId))
    );

    const allOffers = [];
    for (const result of results) {
        if (result.status === 'fulfilled') {
            allOffers.push(...result.value);
        } else {
            console.error('Ошибка в адаптере:', result.reason);
        }
    }
    return allOffers;
}
