# Neopets ItemDB Price Helper

A display-only Tampermonkey userscript that adds ItemDB price estimates to your Neopets **Quick Stock** and **Shop Stock** pages.

It helps you review items you already own and manually decide what to do with them.

## Features

### Quick Stock

Adds an **ItemDB Price** column beside each item name.

If multiple copies of an item are stacked together, the script also displays the estimated total value of the stack.

### Shop Stock

Adds an **ItemDB Price** column immediately before Neopets’ existing **Your Price** field.

The script does not change or fill in your shop prices.

### ItemDB links

Each displayed price is a link to the matching ItemDB item page. The link opens in a new browser tab so you can review additional pricing information.

## Installation

### 1. Install Tampermonkey

Install the Tampermonkey browser extension for your browser.

### 2. Install the userscript

Open the following userscript link:

```text
https://raw.githubusercontent.com/RickySimpson/np/main/neopets-itemdb-price-helper.user.js
```

Tampermonkey should open an installation screen. Review the script and select **Install**.

### 3. Visit ItemDB

Visit ItemDB at least once to create or renew your ItemDB session:

```text
https://itemdb.com.br/
```

### 4. Open Neopets

Visit either of these pages:

* Quick Stock
* Shop Stock

Reload the page after installing the script.

## How to use it

Once installed, the script runs automatically when you open Quick Stock or Shop Stock.

No additional setup is required.

The script will:

1. Read the item names already displayed by Neopets.
2. Request matching price information from ItemDB.
3. Display the estimated ItemDB price beside each item.
4. Cache the results temporarily to reduce repeated requests.

You still decide and perform every item action manually.

## Refreshing prices

ItemDB prices are cached in your browser for six hours.

To request fresh prices immediately:

1. Open Quick Stock or Shop Stock.
2. Click the Tampermonkey icon in your browser toolbar.
3. Find **Neopets ItemDB Price Helper**.
4. Select **Refresh ItemDB price cache**.

The page will request updated ItemDB information without submitting or changing anything on Neopets.

Missing-item results are cached for one hour.

## ItemDB session requirement

ItemDB currently requires browser userscripts to have an active ItemDB session.

According to ItemDB’s API documentation:

* Logged-out users may need to visit ItemDB approximately every 24 hours.
* Logged-in users may need to visit ItemDB approximately every 14 days.

When the session expires, the script displays **Visit ItemDB** instead of a price.

Open the link, visit ItemDB, and then reload the Neopets page.

## Important pricing information

ItemDB prices are estimates.

Prices may occasionally be:

* Delayed
* Missing
* Outdated
* Inflated
* Incorrect
* Affected by sudden market changes

Always verify valuable items manually before selling, donating, discarding, or otherwise moving them.

## What the script does not do

The script does not:

* Select Stock, Deposit, Donate, Discard, Gallery, Closet, Shed, or Chamber.
* Fill in or change shop prices.
* Submit Neopets forms.
* Buy or sell items.
* Donate or discard items.
* Deposit or move items.
* Collect interest or rewards.
* Run on Neopian NPC or restocking shops.
* Highlight profitable restock items.
* Automatically refresh Neopets pages.
* Make repeated Neopets requests.
* Collect analytics.
* Access credentials, PINs, cookies, or private account information.

The script only displays information. It does not take actions on your behalf.

## Privacy and API use

The script sends item names to ItemDB’s bulk item endpoint to retrieve matching item information.

It does not send your:

* Neopets username
* Account balance
* Shop prices
* Inventory selections
* PIN
* Password
* Browser cookies
* Form contents

Item names are requested in batches of up to 100.

The script uses ItemDB’s recommended:

```text
POST /api/v1/items/many
```

No ItemDB API key is stored in the userscript.

## Rules and disclaimer

This project is designed as a display-only quality-of-life tool. It is similar in concept to ItemDB’s official Safety Deposit Box Pricer.

It does not automate gameplay, submit forms, purchase items, move items, or perform actions on the user’s behalf.

However, Neopets broadly warns against third-party tools that may provide an unfair advantage. This userscript is not officially approved, supported, or endorsed by Neopets.

No third-party developer can guarantee how Neopets may interpret or enforce its rules.

Review the current Neopets and ItemDB rules before using the script.

Do not modify the script to add:

* Automatic form filling
* Automatic buying or selling
* Automatic item actions
* NPC-shop item highlighting
* Automated page refreshing
* Restocking assistance
* Other competitive automation

Use this script at your own discretion.

## Troubleshooting

### Every item says “Visit ItemDB”

Open:

```text
https://itemdb.com.br/
```

After ItemDB loads, return to Neopets and reload the page.

### Prices say “Unavailable”

Check that:

* Tampermonkey is enabled.
* The userscript is enabled.
* Tampermonkey has permission to run on Neopets.
* Tampermonkey has permission to connect to `itemdb.com.br`.
* ItemDB is currently available.

### The ItemDB price column is missing

Reload the page after installing or updating the script.

Also confirm you are viewing:

* Neopets Quick Stock, or
* Neopets Shop Stock

The script does not run on regular inventory pages, NPC shops, the Trading Post, or the Shop Wizard.

### Quick Stock shows a horizontal scrollbar

Version 0.1.1 uses a fixed desktop table layout so the additional price column fits without horizontal overflow.

Long item names may wrap onto a second line.

The original mobile table behavior is preserved.

### Prices are not updating

Use the Tampermonkey menu command:

```text
Refresh ItemDB price cache
```

This clears the six-hour price cache and requests fresh ItemDB information.

### The script stopped working after a Neopets update

Neopets may occasionally change its page design or internal code.

Report the issue through the project’s GitHub Issues page and include:

* The affected page
* Your browser
* Your Tampermonkey version
* A screenshot or sanitized HTML sample
* Any browser console messages beginning with:

```text
[NP ItemDB Price Helper]
```

Do not include passwords, PINs, cookies, authentication tokens, or other private account information.

## Uninstalling

To remove the script:

1. Open the Tampermonkey dashboard.
2. Find **Neopets ItemDB Price Helper**.
3. Select the delete or trash icon.
4. Confirm the removal.

Removing the userscript does not change any Neopets items, shop prices, or account settings.

## Disclaimer

This is an unofficial fan-made userscript.

It is not affiliated with, endorsed by, or supported by Neopets or ItemDB.

Neopets and all related names, images, and trademarks belong to their respective owners.
