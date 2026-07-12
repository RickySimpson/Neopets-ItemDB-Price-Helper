# Neopets ItemDB Price Helper

A display-only Tampermonkey userscript that adds ItemDB price estimates to your Neopets **Quick Stock** and **Shop Stock** pages.

It helps you review items you already own and manually decide what to do with them.

## Features

### Quick Stock

Adds an **ItemDB Price** column beside each item name.

If multiple copies of an item are stacked together, the script also displays the estimated total value of the stack.

For example:

```text
Eo Codestone
7,700 NP each
107,800 NP total
```

### Shop Stock

Adds an **ItemDB Price** column immediately before Neopets’ existing **Your Price** field.

The ItemDB value is displayed separately and does not fill in, replace, or change your shop price.

### ItemDB links

Each displayed price is a link to the matching ItemDB item page.

The link opens in a new browser tab so you can review additional pricing details before making a decision.

## Installation

### 1. Install Tampermonkey

Install the Tampermonkey browser extension for your browser.

After installing it, you may want to pin the Tampermonkey icon to your browser toolbar for easier access.

### 2. Allow Tampermonkey to run userscripts

Chrome-based browsers may require an additional permission before Tampermonkey userscripts can run.

#### Google Chrome

1. Enter the following address in Chrome:

   ```text
   chrome://extensions
   ```

2. Find **Tampermonkey**.

3. Select **Details**.

4. Enable **Allow User Scripts**.

#### Microsoft Edge

1. Enter the following address in Edge:

   ```text
   edge://extensions
   ```

2. Find **Tampermonkey**.

3. Select **Details**.

4. Enable **Allow User Scripts**.

#### If “Allow User Scripts” is not available

Some browser versions may not display that option.

Return to the main Extensions page and enable **Developer mode**.

For Chrome:

```text
chrome://extensions
```

For Edge:

```text
edge://extensions
```

Turn on **Developer mode** near the top of the Extensions page.

You do not need to create or manually load an extension. Developer mode only needs to be enabled so Tampermonkey can execute installed userscripts.

#### Firefox and other browsers

Firefox normally does not require the Chrome-specific **Allow User Scripts** setting.

Make sure Tampermonkey is installed, enabled, and allowed to run on Neopets.

### 3. Install the userscript

Open the following userscript link:

```text
https://raw.githubusercontent.com/RickySimpson/np/main/neopets-itemdb-price-helper.user.js
```

Tampermonkey should open an installation screen.

Review the script and select **Install**.

### 4. Confirm that the script is enabled

1. Select the Tampermonkey icon in your browser toolbar.
2. Open the **Dashboard**.
3. Find **Neopets ItemDB Price Helper**.
4. Confirm that its enable switch is turned on.

### 5. Visit ItemDB

Visit ItemDB at least once to create or renew your ItemDB session:

```text
https://itemdb.com.br/
```

You do not need to search for an item.

Allow the ItemDB page to load, then return to Neopets.

### 6. Open Neopets

Visit either of these pages:

* Neopets Quick Stock
* Neopets Shop Stock

Reload the Neopets page after installing the script.

The **ItemDB Price** column should appear automatically.

## How to use it

Once installed, the script runs automatically when you open Quick Stock or Shop Stock.

No additional configuration is required.

The script will:

1. Read the item names already displayed by Neopets.
2. Request matching item information from ItemDB.
3. Display the estimated ItemDB price beside each item.
4. Cache the results temporarily to reduce repeated requests.

You still decide and perform every item action manually.

## Refreshing prices

ItemDB prices are cached in your browser for six hours.

To request fresh prices immediately:

1. Open Quick Stock or Shop Stock.
2. Select the Tampermonkey icon in your browser toolbar.
3. Find **Neopets ItemDB Price Helper**.
4. Select **Refresh ItemDB price cache**.

The script will clear its stored ItemDB price cache and request updated information.

It will not submit, select, move, price, donate, deposit, discard, or otherwise change anything on Neopets.

Missing-item results are cached for one hour.

## ItemDB session requirement

ItemDB currently requires browser userscripts to have an active ItemDB session.

According to ItemDB’s API documentation:

* Logged-out users may need to visit ItemDB approximately every 24 hours.
* Logged-in users may need to visit ItemDB approximately every 14 days.

When the session expires, the script displays **Visit ItemDB** instead of a price.

Open the link, allow ItemDB to load, and then reload the Neopets page.

## Important pricing information

ItemDB prices are estimates.

Prices may occasionally be:

* Delayed
* Missing
* Outdated
* Inflated
* Incorrect
* Affected by sudden market changes

Always verify valuable items manually before selling, donating, discarding, depositing, or otherwise moving them.

Do not rely on a single price estimate when handling rare or expensive items.

## What the script does not do

The script does not:

* Select Stock.
* Select Deposit.
* Select Donate.
* Select Discard.
* Select Gallery.
* Select Closet.
* Select Shed.
* Select Chamber.
* Fill in shop prices.
* Change shop prices.
* Submit Neopets forms.
* Buy items.
* Sell items.
* Donate items.
* Discard items.
* Deposit items.
* Move items.
* Collect interest.
* Collect rewards.
* Run on Neopian NPC shops.
* Run on restocking shops.
* Highlight profitable restock items.
* Automatically refresh Neopets pages.
* Make repeated Neopets page requests.
* Collect analytics.
* Access passwords.
* Access PINs.
* Read private form contents.
* Take actions on your behalf.

The script only displays information.

## How the script works

### Quick Stock

Neopets already loads the Quick Stock item list through its own page request.

The userscript passively reads the item names from that existing response and displays matching ItemDB information.

It does not request or reload Quick Stock data by itself.

### Shop Stock

The userscript reads the Shop Stock item rows already present on the page.

It places the ItemDB value beside Neopets’ existing price field without modifying that field.

### ItemDB requests

The script sends item names to ItemDB’s bulk item endpoint to retrieve matching item information.

Item names are requested in batches of up to 100.

The script uses ItemDB’s recommended endpoint:

```text
POST /api/v1/items/many
```

No ItemDB API key is stored in the userscript.

## Privacy

The script sends item names to ItemDB so that matching item information can be returned.

It does not send your:

* Neopets username
* Password
* PIN
* Bank balance
* On-hand Neopoints
* Shop prices
* Inventory selections
* Form contents
* Account settings

The script does not include analytics or tracking.

## Rules and disclaimer

This project is designed as a display-only quality-of-life tool.

It is similar in concept to ItemDB’s official Safety Deposit Box Pricer.

It does not automate gameplay, submit forms, purchase items, move items, price items, or perform actions on the user’s behalf.

However, Neopets broadly warns against third-party tools that may provide an unfair advantage.

This userscript is not officially approved, supported, or endorsed by Neopets.

No third-party developer can guarantee how Neopets may interpret or enforce its rules.

Review the current Neopets and ItemDB rules before using the script.

Do not modify or extend the script to add:

* Automatic form filling
* Automatic buying
* Automatic selling
* Automatic item actions
* Automatic shop pricing
* NPC-shop item highlighting
* Restocking assistance
* Automatic page refreshing
* Automated searching
* Other competitive automation

Use this script at your own discretion.

## Troubleshooting

### The script installed, but nothing appears

Confirm that:

* Tampermonkey is enabled.
* **Neopets ItemDB Price Helper** is enabled in the Tampermonkey dashboard.
* Chrome or Edge has **Allow User Scripts** enabled.
* Developer mode is enabled if your browser does not show **Allow User Scripts**.
* You are viewing Quick Stock or Shop Stock.
* The Neopets page was reloaded after installation.

### Every item says “Visit ItemDB”

Open:

```text
https://itemdb.com.br/
```

Allow the page to load.

Then return to Neopets and reload Quick Stock or Shop Stock.

### Prices say “Unavailable”

Check that:

* Tampermonkey is enabled.
* The userscript is enabled.
* Tampermonkey has permission to run on Neopets.
* Tampermonkey has permission to connect to `itemdb.com.br`.
* Your ItemDB session is active.
* ItemDB is currently available.

You can also open ItemDB directly and then reload the Neopets page.

### The ItemDB price column is missing

Reload the page after installing or updating the script.

Confirm that you are viewing:

* Neopets Quick Stock, or
* Neopets Shop Stock

The script does not run on:

* The standard Inventory page
* The Safety Deposit Box
* The Trading Post
* The Auction House
* The Shop Wizard
* Neopian NPC shops
* Restocking shops

### Quick Stock shows a horizontal scrollbar

Version 0.1.1 and later use a fixed desktop table layout so the additional price column can fit without horizontal overflow.

Long item names may wrap onto a second line when needed.

The original mobile table behavior is preserved.

### Prices are not updating

Use the Tampermonkey menu command:

```text
Refresh ItemDB price cache
```

This clears the six-hour price cache and immediately requests fresh ItemDB information.

### The displayed price looks wrong

ItemDB prices are estimates and can sometimes be stale or affected by unusual market activity.

Open the price link and review the ItemDB item page.

For valuable items, also verify the current market manually before taking action.

### The script stopped working after a Neopets update

Neopets may occasionally change its page design, HTML, or internal page code.

Report the problem through the project’s GitHub Issues page and include:

* The affected page
* Your browser name and version
* Your Tampermonkey version
* The installed userscript version
* A screenshot or sanitized HTML sample
* Any browser console messages beginning with:

```text
[NP ItemDB Price Helper]
```

Do not include:

* Passwords
* PINs
* Cookies
* Authentication tokens
* Session information
* Private account details

## Updating the script

Tampermonkey should periodically check for userscript updates.

To manually check:

1. Open the Tampermonkey dashboard.
2. Find **Neopets ItemDB Price Helper**.
3. Open the script’s options or context menu.
4. Select **Check for userscript updates**.

After an update, reload Quick Stock or Shop Stock.

## Uninstalling

To remove the script:

1. Open the Tampermonkey dashboard.
2. Find **Neopets ItemDB Price Helper**.
3. Select the delete or trash icon.
4. Confirm the removal.

Removing the userscript does not change any Neopets items, shop prices, selections, or account settings.

## Disclaimer

This is an unofficial fan-made userscript.

It is not affiliated with, endorsed by, approved by, or supported by Neopets or ItemDB.

Neopets and all related names, images, and trademarks belong to their respective owners.
