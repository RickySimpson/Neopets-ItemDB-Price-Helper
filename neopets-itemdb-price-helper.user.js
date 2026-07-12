// ==UserScript==
// @name         Neopets ItemDB Price Helper
// @namespace    https://github.com/RickySimpson/np
// @version      0.1.3
// @description  Displays ItemDB prices on Neopets Quick Stock and Shop Stock. Display only; never selects, prices, submits, buys, sells, donates, or moves items.
// @author       RickySimpson
// @homepageURL  https://github.com/RickySimpson/np
// @supportURL   https://github.com/RickySimpson/np/issues
// @updateURL    https://raw.githubusercontent.com/RickySimpson/np/main/neopets-itemdb-price-helper.user.js
// @downloadURL  https://raw.githubusercontent.com/RickySimpson/np/main/neopets-itemdb-price-helper.user.js
// @match        *://neopets.com/quickstock.phtml*
// @match        *://www.neopets.com/quickstock.phtml*
// @match        *://*.neopets.com/quickstock.phtml*
// @match        *://neopets.com/market.phtml*
// @match        *://www.neopets.com/market.phtml*
// @match        *://*.neopets.com/market.phtml*
// @connect      itemdb.com.br
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @noframes
// ==/UserScript==

(() => {
    'use strict';

    const VERSION = '0.1.3';
    const SCRIPT_PREFIX = '[NP ItemDB Price Helper]';
    const ITEMDB_API_URL = 'https://itemdb.com.br/api/v1/items/many';
    const ITEMDB_HOME_URL = 'https://itemdb.com.br/';
    const CACHE_KEY = 'np-itemdb-price-helper-cache-v1';
    const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
    const MISSING_CACHE_TTL_MS = 60 * 60 * 1000;
    const MAX_CACHE_ENTRIES = 750;
    const API_CHUNK_SIZE = 100;

    const path = window.location.pathname.toLowerCase();
    const pageType = new URLSearchParams(window.location.search).get('type');
    const isQuickStockPage = path.endsWith('/quickstock.phtml');
    const isShopStockPage = path.endsWith('/market.phtml') && pageType === 'your';

    if (!isQuickStockPage && !isShopStockPage) return;

    const state = {
        apiStatus: 'idle',
        pricesByName: new Map(),
        requestedNames: new Set(),
        requestInProgress: false,
        renderQueued: false,
        lastTableFound: false,
        lastVisibleItemCount: 0,
        lastError: '',
    };

    let pageObserver = null;

    addStyles();
    registerMenuCommands();
    startPageObserver();
    scheduleRender();

    console.info(SCRIPT_PREFIX, `Version ${VERSION} started on ${window.location.href}`);

    function addStyles() {
        GM_addStyle(`
            .np-idb-price-header,
            .np-idb-price-cell {
                box-sizing: border-box;
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

            .np-idb-price-main,
            .np-idb-price-detail,
            .np-idb-price-label,
            .np-idb-price-muted {
                display: block;
            }

            .np-idb-price-detail,
            .np-idb-price-label {
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
            try {
                window.localStorage.removeItem(CACHE_KEY);
            } catch (error) {
                console.warn(SCRIPT_PREFIX, 'Could not clear the local cache.', error);
            }

            state.pricesByName.clear();
            state.requestedNames.clear();
            state.apiStatus = 'idle';
            state.lastError = '';
            scheduleRender();
        });

        GM_registerMenuCommand('Show helper status', () => {
            const page = isQuickStockPage ? 'Quick Stock' : 'Shop Stock';
            const message = [
                `Neopets ItemDB Price Helper v${VERSION}`,
                `Page: ${page}`,
                `Table found: ${state.lastTableFound ? 'Yes' : 'No'}`,
                `Visible items found: ${state.lastVisibleItemCount}`,
                `ItemDB status: ${state.apiStatus}`,
                state.lastError ? `Last error: ${state.lastError}` : '',
            ].filter(Boolean).join('\n');

            window.alert(message);
        });
    }

    function startPageObserver() {
        if (!pageObserver) {
            pageObserver = new MutationObserver((mutations) => {
                const hasRelevantChange = mutations.some((mutation) => {
                    const target = mutation.target instanceof Element
                        ? mutation.target
                        : mutation.target.parentElement;

                    return !target?.closest?.('.np-idb-price-cell, .np-idb-price-header');
                });

                if (hasRelevantChange) scheduleRender();
            });
        }

        pageObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    function scheduleRender() {
        if (state.renderQueued) return;
        state.renderQueued = true;

        window.requestAnimationFrame(() => {
            state.renderQueued = false;
            pageObserver?.disconnect();

            try {
                const names = isQuickStockPage
                    ? renderQuickStockFromDom()
                    : renderShopStockFromDom();

                state.lastVisibleItemCount = names.length;
                void loadPrices(names);
            } finally {
                startPageObserver();
            }
        });
    }

    function renderQuickStockFromDom() {
        const table = document.querySelector(
            '#quickstock-table-container table.quickstock-table, #quickstock-table-container table'
        );
        state.lastTableFound = Boolean(table);
        if (!table) return [];

        insertHeaderAfterFirstColumn(table.querySelector('thead tr'));
        document.querySelectorAll('.quickstock-thead-clone table thead tr')
            .forEach(insertHeaderAfterFirstColumn);

        const names = [];
        const rows = table.querySelectorAll('tbody tr');

        for (const row of rows) {
            const nameCell = row.cells && row.cells[0];
            if (!nameCell) continue;

            const priceCell = ensureCellAfter(nameCell);
            const name = extractQuickStockItemName(nameCell);

            if (!name || /^check all$/i.test(name)) {
                renderMuted(priceCell, name ? '—' : '');
                continue;
            }

            const isCash = Boolean(row.querySelector('.qs-cash-marker'));
            if (isCash) {
                renderMuted(priceCell, 'NC item');
                continue;
            }

            const quantity = extractQuantity(nameCell);
            names.push(name);
            renderPriceCell(priceCell, name, quantity, false);
        }

        return uniqueNames(names);
    }

    function renderShopStockFromDom() {
        const table = document.querySelector(
            '#market-your-app table.market-your-table, #market-your-app table'
        );
        state.lastTableFound = Boolean(table);
        if (!table) return [];

        const headerRow = table.querySelector('thead tr');
        if (headerRow && !headerRow.querySelector('.np-idb-price-header')) {
            const yourPriceHeader = Array.from(headerRow.cells || []).find((cell) =>
                /your price/i.test(cell.textContent || '')
            );

            if (yourPriceHeader) {
                const header = createPriceHeader();
                yourPriceHeader.insertAdjacentElement('beforebegin', header);
            }
        }

        const names = [];
        const priceInputs = table.querySelectorAll('tbody input[name^="cost_"]');

        for (const input of priceInputs) {
            const row = input.closest('tr');
            const currentPriceCell = input.closest('td');
            if (!row || !currentPriceCell) continue;

            const itemNameElement = row.querySelector('.market-your-item__name');
            const itemImage = row.querySelector('.market-your-item__img[alt], img[alt]');
            const name = decodeHtml(
                itemNameElement?.textContent?.trim()
                || itemImage?.getAttribute('alt')?.trim()
                || ''
            );
            if (!name) continue;

            let priceCell = row.querySelector('.np-idb-price-cell');
            if (!priceCell) {
                priceCell = document.createElement('td');
                priceCell.className = 'np-idb-price-cell';
                currentPriceCell.insertAdjacentElement('beforebegin', priceCell);
            }

            names.push(name);
            renderPriceCell(priceCell, name, 1, true);
        }

        return uniqueNames(names);
    }

    function createPriceHeader() {
        const header = document.createElement('th');
        header.className = 'np-idb-price-header';
        header.innerHTML = 'ItemDB Price<small>display only</small>';
        return header;
    }

    function insertHeaderAfterFirstColumn(headerRow) {
        if (!headerRow || headerRow.querySelector('.np-idb-price-header')) return;
        const firstHeader = headerRow.cells && headerRow.cells[0];
        if (!firstHeader) return;
        firstHeader.insertAdjacentElement('afterend', createPriceHeader());
    }

    function ensureCellAfter(referenceCell) {
        const nextCell = referenceCell.nextElementSibling;
        if (nextCell && nextCell.classList.contains('np-idb-price-cell')) return nextCell;

        const existing = referenceCell.parentElement?.querySelector('.np-idb-price-cell');
        if (existing) return existing;

        const cell = document.createElement('td');
        cell.className = 'np-idb-price-cell';
        referenceCell.insertAdjacentElement('afterend', cell);
        return cell;
    }

    function extractQuickStockItemName(cell) {
        const clone = cell.cloneNode(true);
        clone.querySelectorAll('.qs-count-badge, .qs-cash-marker').forEach((node) => node.remove());
        return decodeHtml(clone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function extractQuantity(cell) {
        const badge = cell.querySelector('.qs-count-badge');
        const match = badge?.textContent?.match(/(\d[\d,]*)/);
        return match ? Number(match[1].replace(/,/g, '')) : 1;
    }

    async function loadPrices(inputNames) {
        const names = uniqueNames(inputNames);
        if (names.length === 0 || state.requestInProgress) return;

        const missingNames = [];
        for (const name of names) {
            const normalized = normalizeName(name);
            const cached = readFreshCacheEntry(normalized);

            if (cached) {
                state.pricesByName.set(normalized, cached.value);
            } else if (!state.pricesByName.has(normalized) && !state.requestedNames.has(normalized)) {
                missingNames.push(name);
                state.requestedNames.add(normalized);
            }
        }

        if (missingNames.length === 0) {
            if (state.pricesByName.size > 0) state.apiStatus = 'ready';
            return;
        }

        state.requestInProgress = true;
        state.apiStatus = 'loading';
        state.lastError = '';
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
            const status = Number(error?.status) || 0;
            if (status === 401 || status === 403) {
                state.apiStatus = 'auth';
            } else if (status === 429) {
                state.apiStatus = 'rate-limit';
            } else {
                state.apiStatus = 'error';
            }

            state.lastError = error?.message || String(error);
            console.warn(SCRIPT_PREFIX, state.lastError);

            for (const name of missingNames) {
                state.requestedNames.delete(normalizeName(name));
            }
        } finally {
            state.requestInProgress = false;
            scheduleRender();
        }
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
                anonymous: false,
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
                renderStatusLink(
                    cell,
                    'Visit ItemDB',
                    'ItemDB session expired. Visit ItemDB, then reload this Neopets page.'
                );
            } else if (state.apiStatus === 'rate-limit') {
                renderMuted(cell, 'Rate limited');
            } else if (state.apiStatus === 'error') {
                renderMuted(cell, 'Unavailable');
            } else {
                renderMuted(cell, 'Loading...');
            }
            return;
        }

        if (item.missing) {
            renderStatusLink(
                cell,
                'Not found',
                `ItemDB did not return a match for ${itemName}.`,
                itemPageUrl(itemName)
            );
            return;
        }

        if (item.isNC) {
            renderStatusLink(
                cell,
                'NC item',
                'This is a Neocash item; no NP shop price is shown.',
                itemPageUrl(item.name, item.slug)
            );
            return;
        }

        const value = item.price && item.price.value;
        if (!Number.isFinite(value) || value <= 0) {
            renderStatusLink(
                cell,
                'No price',
                'ItemDB does not currently have an NP price for this item.',
                itemPageUrl(item.name, item.slug)
            );
            return;
        }

        const main = document.createElement('a');
        main.className = 'np-idb-price-main';
        main.href = itemPageUrl(item.name, item.slug);
        main.target = '_blank';
        main.rel = 'noopener noreferrer';
        main.textContent = `${item.price.inflated ? 'Warning: ' : ''}${formatNp(value)} NP`;

        const titleParts = ['ItemDB estimated price', 'display only'];
        if (item.price.addedAt) {
            const date = new Date(item.price.addedAt);
            if (!Number.isNaN(date.getTime())) {
                titleParts.push(`updated ${date.toLocaleString()}`);
            }
        }
        if (item.price.inflated) titleParts.push('marked inflated by ItemDB');
        main.title = titleParts.join(' - ');
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

    function uniqueNames(names) {
        const seen = new Set();
        const result = [];

        for (const name of names) {
            const clean = decodeHtml(String(name || '')).replace(/\s+/g, ' ').trim();
            if (!clean) continue;
            const normalized = normalizeName(clean);
            if (seen.has(normalized)) continue;
            seen.add(normalized);
            result.push(clean);
        }

        return result;
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
})();
