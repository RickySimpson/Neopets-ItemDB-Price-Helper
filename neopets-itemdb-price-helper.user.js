// ==UserScript==
// @name         Neopets ItemDB Price Helper
// @namespace    https://github.com/RickySimpson/np
// @version      0.1.2
// @description  Displays ItemDB prices on Neopets Quick Stock and Shop Stock. Display only; never selects, prices, submits, buys, sells, donates, or moves items.
// @author       RickySimpson
// @homepageURL  https://github.com/RickySimpson/np
// @supportURL   https://github.com/RickySimpson/np/issues
// @updateURL    https://raw.githubusercontent.com/RickySimpson/np/main/neopets-itemdb-price-helper.user.js
// @downloadURL  https://raw.githubusercontent.com/RickySimpson/np/main/neopets-itemdb-price-helper.user.js
// @match        *://*.neopets.com/quickstock.phtml*
// @match        *://*.neopets.com/market.phtml*
// @connect      itemdb.com.br
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @run-at       document-start
// @noframes
// ==/UserScript==

(() => {
    'use strict';

    const SCRIPT_PREFIX = '[NP ItemDB Price Helper]';
    const ITEMDB_API_URL = 'https://itemdb.com.br/api/v1/items/many';
    const ITEMDB_HOME_URL = 'https://itemdb.com.br/';
    const CACHE_KEY = 'np-itemdb-price-helper-cache-v1';
    const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
    const MISSING_CACHE_TTL_MS = 60 * 60 * 1000;
    const MAX_CACHE_ENTRIES = 750;
    const API_CHUNK_SIZE = 100;
    const QUICKSTOCK_EVENT = 'np-itemdb-helper:quickstock-items';

    const path = window.location.pathname.toLowerCase();
    const pageType = new URLSearchParams(window.location.search).get('type');
    const isQuickStockPage = path.endsWith('/quickstock.phtml');
    const isShopStockPage = path.endsWith('/market.phtml') && pageType === 'your';

    if (!isQuickStockPage && !isShopStockPage) return;

    const state = {
        apiStatus: 'idle', // idle | loading | ready | auth | rate-limit | error
        pricesByName: new Map(),
        quickStockItemsByName: new Map(),
        shopRowsByIndex: new Map(),
        renderQueued: false,
    };

    addStyles();
    registerMenuCommands();

    if (isQuickStockPage) {
        installQuickStockFetchObserver();
        document.addEventListener(QUICKSTOCK_EVENT, handleQuickStockPayload);
    }

    onDomReady(() => {
        observePageChanges();

        if (isShopStockPage) {
            initializeShopStock();
        }

        scheduleRender();
    });

    function addStyles() {
        GM_addStyle(`
            .np-idb-price-header,
            .np-idb-price-cell {
                text-align: center !important;
                vertical-align: middle !important;
                min-width: 118px;
                white-space: nowrap;
            }

            .np-idb-price-header {
                line-height: 1.1;
            }

            .np-idb-price-header small {
                display: block;
                margin-top: 3px;
                font-family: Arial, sans-serif;
                font-size: 9px;
                font-weight: normal;
                opacity: 0.85;
            }

            .np-idb-price-cell a {
                color: #1769aa !important;
                font-weight: 700;
                text-decoration: underline;
                text-decoration-style: dotted;
                text-underline-offset: 2px;
            }

            .np-idb-price-cell a:hover,
            .np-idb-price-cell a:focus {
                color: #0d4776 !important;
                text-decoration-style: solid;
            }

            .np-idb-price-main {
                display: block;
            }

            .np-idb-price-detail,
            .np-idb-price-label {
                display: block;
                margin-top: 3px;
                font-size: 10px;
                line-height: 1.2;
                white-space: normal;
            }

            .np-idb-price-detail {
                color: #665f52;
                font-weight: normal;
            }

            .np-idb-price-muted {
                color: #777;
                font-size: 11px;
                font-weight: normal;
                white-space: normal;
            }

            .np-idb-price-label {
                display: none;
                color: #665f52;
                font-weight: 700;
            }

            .np-idb-price-warning {
                cursor: help;
            }

            /*
             * Neopets gives the first Quick Stock column a 410px minimum width
             * on desktop. Adding another fixed-width column can therefore create
             * a small horizontal scrollbar. Keep the table at 100% width and let
             * the item-name and ItemDB columns wrap instead.
             *
             * This is desktop-only so the site's existing mobile horizontal-table
             * behavior remains unchanged.
             */
            @media (min-width: 1024px) {
                #quickstock-table-container {
                    overflow-x: hidden !important;
                }

                .quickstock-table.np-table {
                    width: 100% !important;
                    table-layout: fixed;
                }

                .quickstock-table.np-table thead th:first-child,
                .quickstock-table.np-table tbody td:first-child {
                    width: 26% !important;
                    min-width: 0 !important;
                    overflow-wrap: anywhere;
                }

                .quickstock-table.np-table .np-idb-price-header,
                .quickstock-table.np-table .np-idb-price-cell {
                    width: 10% !important;
                    min-width: 0;
                    padding-left: 4px !important;
                    padding-right: 4px !important;
                    white-space: normal;
                }

                .quickstock-table.np-table thead th:nth-child(n + 3),
                .quickstock-table.np-table tbody td:nth-child(n + 3) {
                    width: 8% !important;
                }
            }

            @media (max-width: 768px) {
                .market-your-table .np-idb-price-cell {
                    white-space: normal;
                }

                .market-your-table .np-idb-price-label {
                    display: block;
                    margin-bottom: 4px;
                }
            }
        `);
    }

    function registerMenuCommands() {
        if (typeof GM_registerMenuCommand !== 'function') return;

        GM_registerMenuCommand('Refresh ItemDB price cache', () => {
            refreshPriceCache();
        });
    }

    function refreshPriceCache() {
        try {
            window.localStorage.removeItem(CACHE_KEY);
        } catch (error) {
            console.warn(SCRIPT_PREFIX, 'Could not clear the local price cache.', error);
        }

        state.pricesByName.clear();
        state.apiStatus = 'idle';
        scheduleRender();

        const names = isQuickStockPage
            ? Array.from(state.quickStockItemsByName.values())
                .filter((item) => !item.isCash)
                .map((item) => item.name)
            : Array.from(state.shopRowsByIndex.values()).map((row) => row.name);

        if (names.length > 0) {
            console.info(SCRIPT_PREFIX, 'Price cache cleared; requesting fresh ItemDB prices.');
            void loadPrices(names);
        } else {
            console.info(SCRIPT_PREFIX, 'Price cache cleared. Prices will refresh when the page items finish loading.');
        }
    }

    function onDomReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }

    function observePageChanges() {
        const observer = new MutationObserver(() => scheduleRender());
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    function scheduleRender() {
        if (state.renderQueued) return;
        state.renderQueued = true;

        window.requestAnimationFrame(() => {
            state.renderQueued = false;
            if (isQuickStockPage) renderQuickStock();
            if (isShopStockPage) renderShopStock();
        });
    }

    // ---------------------------------------------------------------------
    // Quick Stock: passively observe Neopets' existing AJAX response.
    // The response returned to Neopets is never modified or delayed.
    // ---------------------------------------------------------------------

    function installQuickStockFetchObserver() {
        const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        if (targetWindow.__npItemdbPriceHelperFetchPatched) return;
        if (typeof targetWindow.fetch !== 'function') return;

        targetWindow.__npItemdbPriceHelperFetchPatched = true;
        const originalFetch = targetWindow.fetch;

        targetWindow.fetch = async function patchedFetch(...args) {
            const response = await originalFetch.apply(this, args);

            try {
                const requestTarget = args[0];
                const requestUrl = typeof requestTarget === 'string'
                    ? requestTarget
                    : requestTarget && requestTarget.url;
                const url = new URL(requestUrl, window.location.href);

                if (url.pathname.endsWith('/np-templates/ajax/quickstock/get_items.php')) {
                    response.clone().json().then((payload) => {
                        document.dispatchEvent(new CustomEvent(QUICKSTOCK_EVENT, {
                            detail: JSON.stringify(payload),
                        }));
                    }).catch((error) => {
                        console.warn(SCRIPT_PREFIX, 'Could not read the Quick Stock response.', error);
                    });
                }
            } catch (error) {
                console.warn(SCRIPT_PREFIX, 'Quick Stock response observer failed safely.', error);
            }

            return response;
        };
    }

    function handleQuickStockPayload(event) {
        let payload;
        try {
            payload = JSON.parse(event.detail);
        } catch {
            return;
        }

        if (!payload || payload.success !== true || !Array.isArray(payload.items)) return;

        state.quickStockItemsByName.clear();
        const namesToLoad = [];

        for (const item of payload.items) {
            if (!item || typeof item.name !== 'string') continue;
            const cleanName = decodeHtml(item.name).trim();
            state.quickStockItemsByName.set(normalizeName(cleanName), {
                ...item,
                name: cleanName,
            });

            if (!item.isCash) namesToLoad.push(cleanName);
        }

        scheduleRender();
        void loadPrices(namesToLoad);
    }

    function renderQuickStock() {
        const table = document.querySelector('#quickstock-table-container table.quickstock-table');
        if (!table) return;

        insertHeaderAfterFirstColumn(table.querySelector('thead tr'));

        // Neopets creates a detached sticky-header clone. Keep its column count
        // identical so the site's own width-sync code continues to work.
        document.querySelectorAll('.quickstock-thead-clone table.quickstock-table thead tr')
            .forEach(insertHeaderAfterFirstColumn);

        const rows = table.querySelectorAll('tbody tr');
        for (const row of rows) {
            const nameCell = row.cells && row.cells[0];
            if (!nameCell) continue;

            const priceCell = ensureCellAfter(nameCell);
            const visibleText = nameCell.textContent.trim();

            if (/^check all$/i.test(visibleText)) {
                renderMuted(priceCell, '—');
                continue;
            }

            const name = extractQuickStockItemName(nameCell);
            if (!name) {
                priceCell.replaceChildren();
                continue;
            }

            const inventoryItem = state.quickStockItemsByName.get(normalizeName(name));
            const isCash = Boolean(inventoryItem && inventoryItem.isCash)
                || Boolean(row.querySelector('.qs-cash-marker'));

            if (isCash) {
                renderMuted(priceCell, 'NC item');
                continue;
            }

            const quantity = Number(inventoryItem && inventoryItem.count) || extractQuantity(nameCell) || 1;
            renderPriceCell(priceCell, name, quantity, false);
        }
    }

    function insertHeaderAfterFirstColumn(headerRow) {
        if (!headerRow || headerRow.querySelector('.np-idb-price-header')) return;
        const firstHeader = headerRow.cells && headerRow.cells[0];
        if (!firstHeader) return;

        const header = document.createElement('th');
        header.className = 'np-idb-price-header';
        header.innerHTML = 'ItemDB Price<small>display only</small>';
        firstHeader.insertAdjacentElement('afterend', header);
    }

    function extractQuickStockItemName(cell) {
        const clone = cell.cloneNode(true);
        clone.querySelectorAll('.qs-count-badge, .qs-cash-marker').forEach((node) => node.remove());
        return decodeHtml(clone.textContent).trim();
    }

    function extractQuantity(cell) {
        const badge = cell.querySelector('.qs-count-badge');
        const match = badge && badge.textContent.match(/(\d[\d,]*)/);
        return match ? Number(match[1].replace(/,/g, '')) : 1;
    }

    // ---------------------------------------------------------------------
    // Shop Stock: read the page's existing row configuration and add a
    // separate display-only column immediately before "Your Price".
    // ---------------------------------------------------------------------

    async function initializeShopStock() {
        const config = await waitFor(() => {
            const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            return targetWindow.__marketYourConfig;
        }, 10000);

        if (!config || !Array.isArray(config.rows)) {
            console.warn(SCRIPT_PREFIX, 'Shop Stock configuration was not found.');
            return;
        }

        state.shopRowsByIndex.clear();
        const namesToLoad = [];

        for (const row of config.rows) {
            if (!row || typeof row.name !== 'string') continue;
            const cleanName = decodeHtml(row.name).trim();
            state.shopRowsByIndex.set(String(row.idx), {
                ...row,
                name: cleanName,
            });
            namesToLoad.push(cleanName);
        }

        scheduleRender();
        void loadPrices(namesToLoad);
    }

    function renderShopStock() {
        const table = document.querySelector('#market-your-app table.market-your-table');
        if (!table) return;

        const headerRow = table.querySelector('thead tr');
        if (headerRow && !headerRow.querySelector('.np-idb-price-header')) {
            const priceHeader = Array.from(headerRow.cells).find((cell) =>
                /your price/i.test(cell.textContent)
            );

            if (priceHeader) {
                const header = document.createElement('th');
                header.className = 'np-idb-price-header';
                header.innerHTML = 'ItemDB Price<small>display only</small>';
                priceHeader.insertAdjacentElement('beforebegin', header);
            }
        }

        const priceInputs = table.querySelectorAll('tbody input[name^="cost_"]');
        for (const input of priceInputs) {
            const match = input.name.match(/^cost_(.+)$/);
            if (!match) continue;

            const rowData = state.shopRowsByIndex.get(match[1]);
            const tableRow = input.closest('tr');
            const currentPriceCell = input.closest('td');
            if (!rowData || !tableRow || !currentPriceCell) continue;

            let priceCell = tableRow.querySelector('.np-idb-price-cell');
            if (!priceCell) {
                priceCell = document.createElement('td');
                priceCell.className = 'np-idb-price-cell';
                currentPriceCell.insertAdjacentElement('beforebegin', priceCell);
            }

            renderPriceCell(priceCell, rowData.name, Number(rowData.amount) || 1, true);
        }
    }

    // ---------------------------------------------------------------------
    // ItemDB API + cache
    // ---------------------------------------------------------------------

    async function loadPrices(inputNames) {
        const names = Array.from(new Set(
            inputNames
                .map((name) => decodeHtml(String(name)).trim())
                .filter(Boolean)
        ));

        if (names.length === 0) return;

        const missingNames = [];
        for (const name of names) {
            const normalized = normalizeName(name);
            const cached = readFreshCacheEntry(normalized);
            if (cached) {
                state.pricesByName.set(normalized, cached.value);
            } else if (!state.pricesByName.has(normalized)) {
                missingNames.push(name);
            }
        }

        if (missingNames.length === 0) {
            state.apiStatus = 'ready';
            scheduleRender();
            return;
        }

        state.apiStatus = 'loading';
        scheduleRender();

        try {
            for (let start = 0; start < missingNames.length; start += API_CHUNK_SIZE) {
                const chunk = missingNames.slice(start, start + API_CHUNK_SIZE);
                const responseData = await requestItemDbItems(chunk);
                const returnedByName = new Map();

                for (const item of Object.values(responseData || {})) {
                    if (!item || typeof item.name !== 'string') continue;
                    const compact = compactItemData(item);
                    const normalized = normalizeName(compact.name);
                    returnedByName.set(normalized, compact);
                    state.pricesByName.set(normalized, compact);
                    writeCacheEntry(normalized, compact);
                }

                for (const requestedName of chunk) {
                    const normalized = normalizeName(requestedName);
                    if (returnedByName.has(normalized)) continue;
                    const missingValue = { missing: true, name: requestedName };
                    state.pricesByName.set(normalized, missingValue);
                    writeCacheEntry(normalized, missingValue);
                }
            }

            state.apiStatus = 'ready';
        } catch (error) {
            if (error && error.status === 401) {
                state.apiStatus = 'auth';
            } else if (error && error.status === 429) {
                state.apiStatus = 'rate-limit';
            } else {
                state.apiStatus = 'error';
            }
            console.warn(SCRIPT_PREFIX, error && error.message ? error.message : error);
        }

        scheduleRender();
    }

    function requestItemDbItems(names) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: ITEMDB_API_URL,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ name: names }),
                timeout: 20000,
                onload(response) {
                    if (response.status === 200) {
                        try {
                            resolve(JSON.parse(response.responseText));
                        } catch {
                            reject(createHttpError(response.status, 'ItemDB returned invalid JSON.'));
                        }
                        return;
                    }

                    reject(createHttpError(
                        response.status,
                        `ItemDB request failed with HTTP ${response.status}.`
                    ));
                },
                ontimeout() {
                    reject(createHttpError(0, 'ItemDB request timed out.'));
                },
                onerror() {
                    reject(createHttpError(0, 'ItemDB request failed.'));
                },
            });
        });
    }

    function createHttpError(status, message) {
        const error = new Error(message);
        error.status = status;
        return error;
    }

    function compactItemData(item) {
        return {
            name: decodeHtml(item.name || '').trim(),
            slug: typeof item.slug === 'string' ? item.slug : '',
            isNC: Boolean(item.isNC),
            status: item.status || '',
            price: item.price ? {
                value: Number.isFinite(Number(item.price.value)) ? Number(item.price.value) : null,
                addedAt: item.price.addedAt || null,
                inflated: Boolean(item.price.inflated),
            } : null,
        };
    }

    function readFreshCacheEntry(normalizedName) {
        const cache = readCache();
        const entry = cache[normalizedName];
        if (!entry || !entry.fetchedAt) return null;

        const ttl = entry.value && entry.value.missing
            ? MISSING_CACHE_TTL_MS
            : CACHE_TTL_MS;

        if (Date.now() - entry.fetchedAt > ttl) return null;
        return entry;
    }

    function readCache() {
        try {
            const parsed = JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    function writeCacheEntry(normalizedName, value) {
        try {
            const cache = readCache();
            cache[normalizedName] = {
                fetchedAt: Date.now(),
                value,
            };

            const entries = Object.entries(cache)
                .sort((a, b) => (b[1].fetchedAt || 0) - (a[1].fetchedAt || 0))
                .slice(0, MAX_CACHE_ENTRIES);

            window.localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
        } catch (error) {
            console.warn(SCRIPT_PREFIX, 'Could not write the local price cache.', error);
        }
    }

    // ---------------------------------------------------------------------
    // Rendering helpers
    // ---------------------------------------------------------------------

    function ensureCellAfter(referenceCell) {
        const existing = referenceCell.parentElement.querySelector('.np-idb-price-cell');
        if (existing) return existing;

        const cell = document.createElement('td');
        cell.className = 'np-idb-price-cell';
        referenceCell.insertAdjacentElement('afterend', cell);
        return cell;
    }

    function renderPriceCell(cell, itemName, quantity, isShopStock) {
        const normalized = normalizeName(itemName);
        const item = state.pricesByName.get(normalized);
        cell.replaceChildren();

        if (isShopStock) {
            const label = document.createElement('span');
            label.className = 'np-idb-price-label';
            label.textContent = 'ItemDB Price';
            cell.appendChild(label);
        }

        if (!item) {
            if (state.apiStatus === 'auth') {
                renderStatusLink(cell, 'Visit ItemDB', 'ItemDB session expired. Visit ItemDB, then reload this Neopets page.');
            } else if (state.apiStatus === 'rate-limit') {
                renderMuted(cell, 'Rate limited');
            } else if (state.apiStatus === 'error') {
                renderMuted(cell, 'Unavailable');
            } else {
                renderMuted(cell, 'Loading…');
            }
            return;
        }

        if (item.missing) {
            renderStatusLink(cell, 'Not found', `ItemDB did not return a match for ${itemName}.`, itemPageUrl(itemName));
            return;
        }

        if (item.isNC) {
            renderStatusLink(cell, 'NC item', 'This is a Neocash item; no NP shop price is shown.', itemPageUrl(item.name, item.slug));
            return;
        }

        const value = item.price && item.price.value;
        if (!Number.isFinite(value) || value <= 0) {
            renderStatusLink(cell, 'No price', 'ItemDB does not currently have an NP price for this item.', itemPageUrl(item.name, item.slug));
            return;
        }

        const main = document.createElement('a');
        main.className = 'np-idb-price-main';
        main.href = itemPageUrl(item.name, item.slug);
        main.target = '_blank';
        main.rel = 'noopener noreferrer';
        main.textContent = `${item.price.inflated ? '⚠ ' : ''}${formatNp(value)} NP`;

        const titleParts = ['ItemDB estimated price', 'display only'];
        if (item.price.addedAt) {
            const date = new Date(item.price.addedAt);
            if (!Number.isNaN(date.getTime())) {
                titleParts.push(`updated ${date.toLocaleString()}`);
            }
        }
        if (item.price.inflated) titleParts.push('marked inflated by ItemDB');
        main.title = titleParts.join(' — ');
        if (item.price.inflated) main.classList.add('np-idb-price-warning');
        cell.appendChild(main);

        if (quantity > 1 && !isShopStock) {
            const detail = document.createElement('span');
            detail.className = 'np-idb-price-detail';
            detail.textContent = `${formatNp(value * quantity)} NP total`;
            cell.appendChild(detail);
        }

        if (isShopStock && value > 999999) {
            const detail = document.createElement('span');
            detail.className = 'np-idb-price-detail';
            detail.textContent = 'over shop maximum';
            cell.appendChild(detail);
        }
    }

    function renderStatusLink(cell, text, title, href = ITEMDB_HOME_URL) {
        const link = document.createElement('a');
        link.className = 'np-idb-price-main';
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = text;
        link.title = title;
        cell.appendChild(link);
    }

    function renderMuted(cell, text) {
        const existingLabel = cell.querySelector('.np-idb-price-label');
        const muted = document.createElement('span');
        muted.className = 'np-idb-price-muted';
        muted.textContent = text;

        if (existingLabel) {
            cell.appendChild(muted);
        } else {
            cell.replaceChildren(muted);
        }
    }

    function itemPageUrl(name, slug = '') {
        const safeSlug = slug || slugify(name);
        return `https://itemdb.com.br/item/${encodeURIComponent(safeSlug)}`;
    }

    function slugify(value) {
        return String(value)
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function normalizeName(value) {
        return decodeHtml(String(value))
            .replace(/\s+/g, ' ')
            .trim()
            .toLocaleLowerCase('en-US');
    }

    function decodeHtml(value) {
        if (!/[&<>]/.test(value)) return value;
        const textarea = document.createElement('textarea');
        textarea.innerHTML = value;
        return textarea.value;
    }

    function formatNp(value) {
        return Math.round(value).toLocaleString('en-US');
    }

    async function waitFor(getValue, timeoutMs) {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
            const value = getValue();
            if (value) return value;
            await delay(50);
        }
        return null;
    }

    function delay(ms) {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
    }
})();
