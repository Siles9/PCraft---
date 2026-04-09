/**
 * Модуль сортировки для веб‑сайта PCraft.
 * Соответствует диаграмме классов (Component, Offer, Build, CompatibilityResult и др.).
 *
 * Функции:
 * - sortComponents      – сортировка компонентов по характеристикам, цене, рейтингу
 * - sortOffers          – сортировка ценовых предложений по цене, доставке, рейтингу продавца
 * - sortBuilds          – сортировка сборок по дате, стоимости, сроку доставки
 * - sortByMultiple      – универсальная комбинированная сортировка по нескольким полям
 *
 * Все функции поддерживают направление (asc / desc) и обрабатывают null/undefined значения.
 */

// ====================== Вспомогательные функции ======================

/**
 * Получить значение поля объекта по строковому пути (например, "specs.socket").
 * @param {object} obj - объект
 * @param {string} path - путь к полю через точку
 * @returns {any} - значение поля или undefined
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

/**
 * Сравнение двух значений с учётом типов и направления.
 * @param {any} a - первое значение
 * @param {any} b - второе значение
 * @param {string} direction - 'asc' или 'desc'
 * @returns {number} - -1, 0, 1
 */
function compareValues(a, b, direction) {
    // Обработка null/undefined: считаем их "меньше" любого определённого значения
    const aIsEmpty = a === null || a === undefined;
    const bIsEmpty = b === null || b === undefined;
    if (aIsEmpty && bIsEmpty) return 0;
    if (aIsEmpty) return direction === 'asc' ? -1 : 1;
    if (bIsEmpty) return direction === 'asc' ? 1 : -1;

    // Строковое сравнение (регистронезависимое для строк)
    if (typeof a === 'string' && typeof b === 'string') {
        a = a.toLowerCase();
        b = b.toLowerCase();
    }

    let result = 0;
    if (a > b) result = 1;
    else if (a < b) result = -1;
    else result = 0;

    return direction === 'asc' ? result : -result;
}

/**
 * Создаёт функцию сравнения для сортировки по одному полю.
 * @param {string} field - имя поля (поддерживается точечная нотация)
 * @param {string} direction - 'asc' или 'desc'
 * @returns {function} - компаратор
 */
function compareByField(field, direction) {
    return (a, b) => {
        const valA = getNestedValue(a, field);
        const valB = getNestedValue(b, field);
        return compareValues(valA, valB, direction);
    };
}

// ====================== Основные функции сортировки ======================

/**
 * Сортировка компонентов.
 * @param {Component[]} components - массив компонентов
 * @param {object} options - параметры сортировки
 * @param {string} options.by - поле сортировки: 'price', 'manufacturer', 'model', 'specs.socket' и др.
 * @param {string} options.direction - 'asc' или 'desc' (по умолчанию 'asc')
 * @param {string} [options.priceSource='min'] - для поля 'price': 'min' (минимальная цена из предложений) или 'max'
 * @returns {Component[]} - новый отсортированный массив
 */
export function sortComponents(components, { by = 'manufacturer', direction = 'asc', priceSource = 'min' } = {}) {
    if (!Array.isArray(components)) return [];

    // Для сортировки по цене нужно вычислить цену компонента на основе его предложений
    if (by === 'price') {
        const componentsWithPrice = components.map(comp => {
            let price = null;
            if (comp.offers && comp.offers.length) {
                const prices = comp.offers.map(o => o.price).filter(p => p !== null && p !== undefined);
                if (prices.length) {
                    price = priceSource === 'min' ? Math.min(...prices) : Math.max(...prices);
                }
            }
            return { ...comp, _sortPrice: price };
        });
        componentsWithPrice.sort(compareByField('_sortPrice', direction));
        return componentsWithPrice.map(({ _sortPrice, ...rest }) => rest);
    }

    // Сортировка по встроенному полю или вложенной характеристике
    const comparator = compareByField(by, direction);
    return [...components].sort(comparator);
}

/**
 * Сортировка ценовых предложений (Offer).
 * @param {Offer[]} offers - массив предложений
 * @param {object} options - параметры сортировки
 * @param {string} options.by - поле: 'price', 'deliveryDays', 'sellerRating'
 * @param {string} options.direction - 'asc' или 'desc'
 * @returns {Offer[]} - новый отсортированный массив
 */
export function sortOffers(offers, { by = 'price', direction = 'asc' } = {}) {
    if (!Array.isArray(offers)) return [];

    let comparator;
    switch (by) {
        case 'price':
            comparator = compareByField('price', direction);
            break;
        case 'deliveryDays':
            comparator = compareByField('deliveryDays', direction);
            break;
        case 'sellerRating':
            comparator = compareByField('sellerRating', direction);
            break;
        default:
            comparator = compareByField(by, direction);
    }
    return [...offers].sort(comparator);
}

/**
 * Сортировка сборок (Build).
 * @param {Build[]} builds - массив сборок
 * @param {object} options - параметры сортировки
 * @param {string} options.by - поле: 'name', 'totalPrice', 'totalDeliveryDays', 'createdAt', 'updatedAt'
 * @param {string} options.direction - 'asc' или 'desc'
 * @returns {Build[]} - новый отсортированный массив
 */
export function sortBuilds(builds, { by = 'createdAt', direction = 'desc' } = {}) {
    if (!Array.isArray(builds)) return [];

    const comparator = compareByField(by, direction);
    return [...builds].sort(comparator);
}

/**
 * Универсальная комбинированная сортировка по нескольким полям.
 * @param {array} items - исходный массив объектов
 * @param {array} criteria - массив критериев [{field: string, direction: 'asc'|'desc'}, ...]
 * @returns {array} - новый отсортированный массив
 */
export function sortByMultiple(items, criteria) {
    if (!Array.isArray(items) || !Array.isArray(criteria) || criteria.length === 0) {
        return items ? [...items] : [];
    }

    return [...items].sort((a, b) => {
        for (const { field, direction = 'asc' } of criteria) {
            const valA = getNestedValue(a, field);
            const valB = getNestedValue(b, field);
            const result = compareValues(valA, valB, direction);
            if (result !== 0) return result;
        }
        return 0;
    });
}

// ====================== Пример использования (для справки) ======================
/*
import { sortComponents, sortOffers, sortBuilds, sortByMultiple } from './sorting.js';

// Сортировка компонентов по цене (возрастание)
const sortedByPrice = sortComponents(components, { by: 'price', direction: 'asc' });

// Сортировка предложений по рейтингу продавца (убывание)
const sortedOffers = sortOffers(offers, { by: 'sellerRating', direction: 'desc' });

// Сортировка сборок по дате создания (сначала новые)
const sortedBuilds = sortBuilds(builds, { by: 'createdAt', direction: 'desc' });

// Комбинированная сортировка: сначала по цене, затем по доставке
const multiSorted = sortByMultiple(components, [
    { field: 'price', direction: 'asc' },
    { field: 'deliveryDays', direction: 'asc' }
]);
*/
