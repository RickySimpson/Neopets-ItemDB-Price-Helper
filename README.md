# Neopets ItemDB Price Helper

A display-only Tampermonkey userscript that adds ItemDB price information to:

- **Neopets Quick Stock**
- **Neopets Shop Stock**

It is intended to help you review items you already own and manually decide what to do with them.

## What it does

### Quick Stock

Adds an **ItemDB Price** column after the item name. Stacked items also show the estimated total value of the stack.

### Shop Stock

Adds an **ItemDB Price** column immediately before Neopets' existing **Your Price** field.

The ItemDB price is a link that opens the matching ItemDB item page in a new tab.

## What it deliberately does not do

This script does **not**:

- Select Stock, Deposit, Donate, Discard, Gallery, Closet, Shed, or Chamber.
- Fill in or change shop prices.
- Submit any Neopets form.
- Buy, sell, donate, discard, deposit, or move items.
- Run on Neopian NPC/restock shops.
- Highlight profitable restock items.
- Make repeated Neopets requests or refresh pages.
- Collect analytics, credentials, PINs, cookies, or account data.

The script passively reads the Quick Stock response that Neopets already loads and reads the Shop Stock rows already present on the page. It sends item names only to ItemDB's bulk item endpoint.

## Important rules disclaimer

This project is designed as a quality-of-life, display-only script, similar in concept to ItemDB's official Safety Deposit Box Pricer. It does not automate gameplay or take actions on the user's behalf.

However, Neopets' published support language broadly warns against third-party tools that provide an unfair advantage. This project is not officially approved or endorsed by Neopets, and no third-party developer can guarantee how Neopets will interpret or enforce its rules. Review the current Neopets and ItemDB rules before use.

Do not extend this script with automatic form filling, automatic item actions, purchasing/selling automation, NPC-shop highlighting, refresh automation, or other competitive features.

## Install

1. Install Tampermonkey in your browser.
2. Open the raw userscript URL after this repository has been pushed to GitHub:

   `https://raw.githubusercontent.com/RickySimpson/np/main/neopets-itemdb-price-helper.user.js`

3. Tampermonkey should offer to install the script.
4. Visit ItemDB once to establish or renew its API session.
5. Reload Neopets Quick Stock or Shop Stock.

## ItemDB session requirement

ItemDB currently requires client-side userscripts to send an ItemDB session cookie. According to ItemDB's API documentation:

- Logged-out users need to visit ItemDB approximately every **24 hours**.
- Logged-in users need to visit ItemDB approximately every **14 days**.

When the session expires, the script displays **Visit ItemDB** instead of a price. Open that link, then reload the Neopets page.

## Caching and API use

- Prices are cached in the browser for **6 hours**.
- Missing-item results are cached for **1 hour**.
- Item names are requested in batches of up to **100**.
- The script uses ItemDB's recommended `POST /api/v1/items/many` endpoint.
- No ItemDB API key is stored in the userscript.

ItemDB prices are estimates and may be delayed, missing, inflated, or inaccurate. Always verify valuable items manually before selling, donating, or discarding them.

## Repository files

- `neopets-itemdb-price-helper.user.js` — installable Tampermonkey userscript.
- `README.md` — documentation and safety notes.
- `LICENSE` — MIT license for this repository's original code.

## Publish to GitHub

From the folder containing these files:

```bash
git init
git branch -M main
git remote add origin https://github.com/RickySimpson/np.git
git add .
git commit -m "Add Neopets ItemDB price helper userscript"
git push -u origin main
```

If the repository was already cloned, omit `git init`, `git branch`, and `git remote add`.

## Initial test checklist

After installing version `0.1.0`:

1. Visit ItemDB and then reload Quick Stock.
2. Confirm Eo Codestone displays the current ItemDB price.
3. Change Quick Stock sorting, NP/NC filtering, stacking, and pagination.
4. Select an item action manually and confirm the script does not change the selection.
5. Open Shop Stock and confirm the ItemDB column appears before **Your Price**.
6. Edit a shop price manually and confirm the ItemDB value stays separate.
7. Submit a normal shop update and confirm Neopets processes it normally.
8. Confirm clicking an ItemDB price only opens ItemDB in a new tab.

## Troubleshooting

### Every item says "Visit ItemDB"

Visit `https://itemdb.com.br/`, then reload the Neopets page.

### Prices say "Unavailable"

Check Tampermonkey's site access and confirm the script has permission to connect to `itemdb.com.br`.

### The column is missing after a Neopets update

Open a GitHub issue and include:

- Which page is affected.
- Browser and Tampermonkey version.
- A saved page source or sanitized HTML snippet.
- Any console messages beginning with `[NP ItemDB Price Helper]`.
