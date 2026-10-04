# Rasel Kitchen — QR menu

A bilingual (Kazakh / Russian) menu that guests open on their phones by scanning the QR code on
their table.

- `/kk` and `/ru` are the menu pages; `/` sends guests to the right one.
- Server-rendered from Cloudflare D1, cached at the edge, readable with JavaScript disabled.
- A **guest basket**: guests pick dishes and sizes, then show a large-print summary to the waiter.
  It lives on the guest's phone only; there are no server-side orders.
- An **admin panel** at `/admin` (Kazakh / Russian) for categories, dishes, sizes, prices,
  photos and the cafe's address, hours and phone, protected by Cloudflare Access.
- Dish photos are served from Cloudflare R2; every dish starts without one.
- Styled with the cafe's logo and its colours, violet and orange.

## Stack

- [SvelteKit 2](https://svelte.dev/docs/kit) with Svelte 5 (runes) and TypeScript
- [Cloudflare Workers with static assets](https://developers.cloudflare.com/workers/static-assets/)
  via `@sveltejs/adapter-cloudflare` (what the adapter and Cloudflare recommend for new projects)
- [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) through
  [Drizzle ORM](https://orm.drizzle.team/), with SQL migrations in `drizzle/migrations`
- [Cloudflare R2](https://developers.cloudflare.com/r2/) for dish photos
- [Tailwind CSS 4](https://tailwindcss.com/)
- Self-hosted fonts **Onest** (text) and **Alegreya** (headings), checked to contain every
  Kazakh letter (Ә Ғ Қ Ң Ө Ұ Ү Һ І) and the ₸ sign

## Requirements

- **Node.js 22.12 or newer.** 24 LTS is recommended (`nvm install 24 && nvm use`). The current
  `wrangler` does not run on Node 20.
- npm
- A Cloudflare account (the free plan is enough), only needed to deploy

## Run it locally

No Cloudflare account is needed: during development the adapter emulates D1 and R2 with
wrangler's platform proxy, storing data in `.wrangler/`.

```bash
npm install
npm run db:migrate:local   # creates the local D1 database: tables + the seeded menu
npm run dev                # http://localhost:5173 → redirects to /kk or /ru
```

The admin panel is at http://localhost:5173/admin. In `npm run dev` it is open without a login (a
banner says so); Cloudflare Access is only checked in the deployed Worker. Photos you upload
locally go to a local R2 emulation in `.wrangler/`.

`npm run preview` builds the app and runs the real Worker with `wrangler dev`
(http://localhost:8787), edge cache included. It uses the same local database.

## Deploy to Cloudflare (one-time setup)

These steps act on the Cloudflare account.

> **Status (2026-10-04):** steps 1–5 and 7 are done. The menu is live at
> https://rasel-kitchen-menu.rasel-kitchen-menu.workers.dev and the admin panel at
> https://rasel-kitchen-menu.rasel-kitchen-menu.workers.dev/admin, behind a Cloudflare Access
> login. All migrations (up to `0002_cafe_info`) are applied to the D1 database
> `rasel-kitchen-menu` (region EEUR), and the dish photos are in the R2 bucket
> `rasel-kitchen-photos`. Still to do: add a domain (step 6, then add it to the Access application)
> and the cache purge (step 8).

1. **Log in**

   ```bash
   npx wrangler login
   ```

2. **Create the D1 database**

   ```bash
   npx wrangler d1 create rasel-kitchen-menu
   ```

   Copy the `database_id` it prints and paste it into `wrangler.jsonc`, replacing
   `REPLACE_WITH_D1_DATABASE_ID` in the `d1_databases` entry. If wrangler offers to add the
   database to your config, answer **no**: the binding is already there.

   D1 places the database near where you run the command. If you are not in or near Kazakhstan,
   add `--location=eeur`.

   > The local database is keyed by `database_id`, so after pasting the real ID run
   > `npm run db:migrate:local` once more. The old local data stays in `.wrangler/`, unused.

3. **Create the R2 bucket for photos.** R2 must first be enabled once for the account: in the
   Cloudflare dashboard open **R2 Object Storage** and follow the steps to enable it. This asks for
   a payment method, but the free tier (10 GB) is far more than a menu's photos need. Otherwise
   `wrangler` fails with error 10042, "Please enable R2". Then create the bucket. There's no ID to
   paste: the bucket name is already in `wrangler.jsonc`. Again, answer **no** if asked to update
   the config.

   ```bash
   npx wrangler r2 bucket create rasel-kitchen-photos
   ```

4. **Create the tables and seed the menu in production**

   ```bash
   npm run db:migrate:remote
   ```

5. **Deploy**

   ```bash
   npm run deploy
   ```

   This prints the `*.workers.dev` URL of the menu.

6. **Add a custom domain** (recommended). In the Cloudflare dashboard go to
   Workers & Pages → `rasel-kitchen-menu` → Settings → Domains & Routes → Add → Custom domain,
   for example `menu.example.kz`. The domain's DNS must be on Cloudflare. Edge caching only works
   on a custom domain; on `workers.dev` every request is rendered. Point the table QR codes at the
   root URL, e.g. `https://menu.example.kz/`. Then add the domain to the Access application (see
   [When you add a custom domain](#when-you-add-a-custom-domain)); until you do, `/admin` on the
   new domain answers 403.

7. **Protect the admin panel with Cloudflare Access.** See
   [Setting up Cloudflare Access](#setting-up-cloudflare-access) below. You'll end up with two
   values to put in `wrangler.jsonc` under `vars`, then run `npm run deploy` again.

8. **Let admin saves clear the cache right away** (optional, recommended). See
   [Cache purge after saves](#cache-purge-after-saves). Without it, guests see changes within a
   minute.

Later deploys are just `npm run deploy`. If you added a migration, run
`npm run db:migrate:remote` first.

## Commands

| Command                     | What it does                                                        |
| --------------------------- | ------------------------------------------------------------------- |
| `npm run dev`               | Dev server with local D1/R2                                         |
| `npm run build`             | Production build (`.svelte-kit/cloudflare`)                         |
| `npm run preview`           | Build, then run the Worker locally with `wrangler dev`              |
| `npm run deploy`            | Build, then deploy with `wrangler deploy`                           |
| `npm run check`             | Type-check (svelte-check)                                           |
| `npm test`                  | Unit tests; also applies all migrations to an in-memory SQLite DB   |
| `npm run format`            | Format with Prettier (`npm run lint` only checks)                   |
| `npm run db:generate`       | Generate a SQL migration from changes in `schema.ts`                |
| `npm run db:migrate:local`  | Apply pending migrations to the local database                      |
| `npm run db:migrate:remote` | Apply pending migrations to the production database                 |
| `npm run db:reset:local`    | Delete the local database and re-apply every migration (fresh menu) |

## Database

Schema: `src/lib/server/db/schema.ts`. Prices are whole tenge. Every guest-facing text has a
`_kk` and a `_ru` column.

- **`categories`**: `id`, `name_kk`, `name_ru`, `sort_order`, `visible` (hidden categories are
  not rendered).
- **`items`**: `id`, `category_id` → categories, `name_kk`, `name_ru`, `description_kk?`,
  `description_ru?`, `photo_key?` (R2 key), `available` (unavailable items stay on the menu,
  greyed out, with a "sold out" badge), `sort_order`.
- **`variants`**: `id`, `item_id` → items (**cascade delete**), `label_kk?`, `label_ru?`,
  `price?` (null = "price on request"), `sort_order`. Every item has at least one variant. A
  single-price item has one variant with null labels; sized items (1 л / 0,5 л) have one per size
  and are shown as one card.
- **`cafe_info`**: the cafe's contact details, a single row (`id` 1) created by the first save in
  the admin panel: `address_kk?`, `address_ru?`, `hours_kk?`, `hours_ru?` (free text), `phone?`,
  `two_gis_url?`. Null means "not filled in": the menu leaves that line out.

The database also has some guard rails. Prices can't be negative. A variant label must be given
in both languages or in neither, and so must the address and the hours. A category that still has
items can't be deleted.

### Seeding

The opening menu is `drizzle/migrations/0001_seed_menu.sql`, so **seeding is part of applying
migrations**:

- locally: `npm run db:migrate:local` (or `npm run db:reset:local` to start over)
- production: `npm run db:migrate:remote`

Wrangler records applied migrations in the `d1_migrations` table, so each database gets the seed
exactly once. Running the remote migrate command again later can never overwrite menu changes.

The cafe's address, hours and phone are not seeded: `0002_cafe_info.sql` only creates their
table. They are typed in on the admin panel's "cafe details" page.

### Changing the schema

1. Edit `src/lib/server/db/schema.ts`.
2. Run `npm run db:generate` and **read the generated SQL** in `drizzle/migrations/`.
3. Run `npm run db:migrate:local`, then `npm test` and `npm run dev` to check.
4. Before deploying, run `npm run db:migrate:remote`.

> **Caution with table rebuilds on D1.** Some changes make drizzle-kit rebuild a table: it
> creates `__new_items`, copies the rows, drops `items` and renames. D1 always enforces foreign
> keys, and drizzle's `PRAGMA foreign_keys=OFF` does nothing inside a migration. So dropping
> `items` cascades and **deletes every variant**, even with `PRAGMA defer_foreign_keys = on`.
> (Verified with SQLite.) Prefer additive changes (`ADD COLUMN`). If a rebuild of `items` is
> unavoidable, copy `variants` into a temporary table before the rebuild and restore it after, in
> the same migration. D1 Time Travel (`npx wrangler d1 time-travel restore`) can roll the
> database back if something goes wrong.

### Editing data from the command line

Normally you edit the menu in the admin panel. For bulk changes, SQL works too:

```bash
npx wrangler d1 execute DB --remote --command "UPDATE items SET available = 0 WHERE id = 3"
npx wrangler d1 execute DB --local  --command "SELECT id, name_ru FROM items"
```

Changes show up on the site within about a minute, the edge cache lifetime.

### Dish photos

A photo belongs to a dish through the dish's `photo_key`: the name of the file in the R2 bucket,
such as `items/23/<random>.webp` for dish 23 (Компот). You never type these keys; they are made when
a photo is uploaded. Two ways to upload:

- **One dish at a time**, in the admin panel: open the dish (`/admin/items/<number>`), choose the
  photo in the "Фото" section and upload it. The browser shrinks it first.
- **Many dishes at once**, with `scripts/upload-photos.py` (needs `pip3 install pillow`). Name each
  file after the dish's number (`01.png`, `23.png`, `23-kompot.jpg`, …), put them in one folder
  (`photos/` in the project is ignored by git) and run:

  ```bash
  python3 scripts/upload-photos.py photos --dry-run   # check which file goes to which dish
  python3 scripts/upload-photos.py photos             # local database, see it with npm run dev
  python3 scripts/upload-photos.py photos --remote    # Cloudflare
  ```

  Each photo is converted to WebP (at most 800 px), stored under a new key and linked to its dish;
  a photo the dish had before is deleted. Run it again with new files to replace photos.

The dish numbers are the ids in the database. For the opening menu they run from 1 (Сорпа) to 37
(Кимчи) in menu order; this lists them:

```bash
npx wrangler d1 execute DB --remote --command "SELECT id, name_ru FROM items ORDER BY id"
```

## How it works

**Languages.** Routes are `/kk` and `/ru` (`src/routes/[lang=lang]`; anything else is a 404). `/`
redirects to the language in the `lang` cookie, otherwise to the best match in the browser's
`Accept-Language`, otherwise to Kazakh. The КЗ / РУ switch is a normal link. With JavaScript it
also saves the choice in the cookie and opens the other language at the same dish
(`/ru#item-12`). `<html lang>` is set per route, and the pages carry `hreflang` alternates and a
canonical link. Interface strings live in `src/lib/i18n.ts`, a small typed dictionary.

**Rendering and caching.** `src/routes/[lang=lang]/+page.server.ts` loads the menu with one SQL
query (joins, no N+1) and the cafe details with a second, both sent to D1 at the same time, and
sends `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
The adapter's Worker stores such responses in Cloudflare's edge cache, so most guests never hit
D1. Edge caching has three limits:

- it only works on a custom domain;
- the cache is per data center;
- Cloudflare's Workers cache ignores `stale-while-revalidate`, so in practice it is a 60-second
  cache.

The language redirect at `/` is never cached.

**Very little JavaScript.** The menu page sets `csr = false`, so it ships none of SvelteKit's
client runtime. Instead, two small scripts are bundled and minified at build time (the
`inline-script` plugin in `vite.config.ts`, using esbuild) and inlined at the end of the page,
about 3.6 KB gzipped together:

- `src/lib/menu/enhance.js` (about 1.3 KB): smooth scrolling for the sticky category tabs,
  highlighting the tab of the section on screen (IntersectionObserver), and the language-switch
  behaviour above;
- `src/lib/menu/basket-ui.ts` (about 2.3 KB): the guest basket (below).

Without JavaScript the tabs are plain anchor links, the basket does not appear, and everything
stays readable. Motion respects `prefers-reduced-motion`. The CSS (about 29 KB) and the logo are
inlined, and the two fonts are preloaded, so the first visit needs only the HTML (about 21 KB
gzipped) and two font files. The admin panel has its own stylesheet (`src/routes/admin/admin.css`), so its styles are not
sent to guests.

**Guest basket.** Each dish (each size, for dishes with several) gets a **+** button. Once something
is in it, it becomes **− n +**, and a bar at the bottom shows the count and total. The bar opens
the basket, where quantities can be changed. **Показать официанту / Даяшыға көрсету** then opens a
full-screen, high-contrast, large-print summary (items, sizes, quantities, total, time) that the
guest shows the waiter or the waiter photographs. There are no orders on the server.

- The basket is stored in `localStorage` as variant ids and quantities only. Names, sizes, prices
  and availability are always read from the menu on the page, so it follows a language switch and
  a price changed in the admin panel is never shown stale. It is forgotten after 6 hours without
  changes (an earlier visit).
- Sold-out dishes have no button. A dish already in the basket that has sold out since stays
  listed, marked sold out, and is left out of the total and the waiter summary. A dish or size
  deleted from the menu (or in a hidden category) is dropped from the basket.
- "Price on request" dishes can be added. They show that text instead of a price and are left
  out of the total; the total then reads "… ₸ +" with a note.
- The logic is plain functions in `src/lib/basket/basket.ts` (unit-tested). The markup is
  server-rendered by `Basket.svelte`: the bar and the two `<dialog>`s are hidden, and the buttons and
  rows are `<template>`s that `basket-ui.ts` clones. The cards only mark where buttons go
  (`data-basket-slot`), so the page does not carry 40 hidden copies of them. Without `<dialog>`
  support (very old browsers) the basket stays hidden.

_Why a small script and not hydration:_ turning `csr` back on for the menu page would ship
SvelteKit's client runtime plus the page's components and a serialized copy of the menu (roughly
30–40 KB gzipped, plus hydration work on cheap phones) to show a few buttons. The script adds about
6 KB gzipped to the page, in the same response, with no extra request. Its cost is hand-written DOM
code, kept small by keeping the logic in `basket.ts` and the markup in Svelte templates. If the
basket ever grows into real ordering (sending orders to the kitchen, a waiter screen), switch the
menu page to hydration: remove `csr = false` from `src/routes/[lang=lang]/+page.server.ts` and move
the basket into Svelte components.

**Photos.** `GET /img/<key>` streams the R2 object `<key>` with a one-year immutable cache
header and ETag support. Images on the menu are lazy-loaded. Because of the immutable caching,
**never overwrite a photo in place**: upload new photos under new keys, e.g.
`items/12/<random>.webp`.

**Fonts.** The `.woff2` files in `src/lib/assets/fonts/` are built by
`scripts/build-fonts.py` (`pip install fonttools brotli`). Each file is trimmed to Latin,
Russian, Kazakh, ₸ and common punctuation. That gives one file per family (32 KB and 30 KB),
where Google Fonts would serve four. Both fonts are under the SIL Open Font License; the licence
files sit next to the fonts.

**Logo and colours.** The logo is inline SVG (`src/lib/brand/`), traced from the designer's PNG
files: the full "Rasel kitchen" logo and the RK monogram for small sizes. It is drawn once per
page and reused with `<use>`. Its violet part takes the text colour, so the same artwork is white
on the violet header and violet on a white page. The colours are tokens in `src/theme.css`:

- the **menu** uses the logo's violet colourway: a violet header with the white and orange logo,
  pale lilac pages, and a dark plum palette for phones in dark mode;
- the **admin panel** uses the white colourway (`src/routes/admin/admin.css`): white pages with
  the violet and orange logo, and it stays light in dark mode.

White text on the logo violet (`#aa72ab`) has a contrast of only 3.7:1, so that violet is kept for
the header behind the logo. Buttons, tabs and violet text use deeper violets that pass WCAG AA,
and the orange (`#f79e45`) only ever carries dark text.

## Customising

- **Address, opening hours, phone, 2GIS link**: in the admin panel, on the "cafe details" page
  (`/admin/cafe`). A field left empty is not shown on the menu.
- **Cafe name** (page titles, link previews): `src/lib/config.ts`.
- **Logo**: `src/lib/brand/logo-art.ts` holds the SVG paths. If the designer's vector file turns
  up, paste its paths there. The icons in `static/` (`favicon.svg`, `apple-touch-icon.png`, and
  `og.png` for link previews) are made from the same logo.
- **Interface text** (both languages): `src/lib/i18n.ts` for guests, `src/lib/admin/i18n.ts` for
  the admin panel. The basket wording (e.g. **Даяшыға көрсету** / **Показать официанту**) and the
  admin texts have not been checked by a native Kazakh speaker yet.
- **Colours**: `src/theme.css` for the menu (light and dark palettes), and
  `src/routes/admin/admin.css` for the admin panel. All text colours meet WCAG AA contrast.
- **Fonts**: `src/app.css` and `scripts/build-fonts.py`.

## Project structure

```
├── drizzle/migrations/          SQL migrations (0000 schema, 0001 menu seed, 0002 cafe details) + metadata
├── scripts/build-fonts.py       Builds the subset web fonts
├── src/
│   ├── app.css                  Menu stylesheet: Tailwind, fonts, base styles
│   ├── theme.css                Colour palette and custom utilities (shared with the admin CSS)
│   ├── app.d.ts                 App.Platform / Env typing for the Cloudflare bindings and vars
│   ├── app.html
│   ├── hooks.server.ts          Admin access check, <html lang>, font preloading, headers
│   ├── params/lang.ts           Route matcher: only kk | ru
│   ├── lib/
│   │   ├── config.ts            The cafe's name
│   │   ├── brand/               The logo: SVG paths and the <Logo> component
│   │   ├── i18n.ts              Languages + UI dictionary
│   │   ├── format.ts            Price formatting ("2 000 ₸")
│   │   ├── photos.ts            R2 photo keys → /img URLs
│   │   ├── assets/fonts/        Self-hosted fonts + licences
│   │   ├── menu/                Public menu: components, types, enhance.js, basket-ui.ts
│   │   ├── basket/              Guest basket logic (storage, totals, checks against the menu)
│   │   ├── admin/               Admin components, dictionary (i18n.ts), photo shrinking
│   │   └── server/
│   │       ├── db/              Drizzle schema + D1 client (+ test-db.ts for tests)
│   │       ├── menu.ts          Menu query (one query, grouped in code)
│   │       ├── lang.ts          Accept-Language / cookie negotiation
│   │       ├── access.ts        Cloudflare Access JWT verification
│   │       ├── purge.ts         Cache purge after admin saves
│   │       └── admin/           Admin form validation, queries/batches, photo checks
│   └── routes/
│       ├── +server.ts           "/" → /kk or /ru
│       ├── [lang=lang]/         The menu page
│       ├── admin/               Admin panel (overview, cafe details, items/new, items/[id])
│       ├── img/[...key]/        Photos from R2
│       └── +error.svelte        Bilingual 404 / error page
├── static/                      favicon, touch icon, link-preview image, robots.txt
├── drizzle.config.ts            drizzle-kit (generates migrations only)
├── svelte.config.js
├── vite.config.ts               Includes the small plugin that minifies the inline script
└── wrangler.jsonc               Worker config and bindings: DB (D1), PHOTOS (R2), ASSETS
```

## Admin panel

`/admin`, in Kazakh or Russian (the same КЗ / РУ switch as the menu; the choice is shared with it).
It works on a phone.

- **Overview** (`/admin`): the cafe details at the top, then every category with its dishes.
  Reorder categories and dishes with ↑ ↓, mark a dish sold out or back in stock with one tap,
  rename, hide or delete a category (only an empty one), add categories and dishes.
- **Cafe details** (`/admin/cafe`): address and opening hours in both languages, phone, and the
  link to the cafe on 2GIS. They appear in the menu's header and footer; the phone becomes a
  tap-to-call link. Every field is optional, and an empty one is left off the menu. The address
  and the hours must be given in both languages or in neither. Only links to 2GIS are accepted.
- **Dish page** (`/admin/items/<id>`): category, names and descriptions in both languages, "in
  stock", and the prices. A dish has one or more variants (sizes or choices such as 1 л / 0,5 л),
  each with a label in both languages and a price in whole tenge, or "price on request". Labels are
  required when there are several variants. Variants can be added, removed and reordered.
- **Photos**: shrunk in the browser before upload (max 800 px, WebP, or JPEG where the browser
  can't write WebP), checked on the server by their first bytes (JPEG, PNG or WebP, max 5 MB), and
  stored in R2 under a new random key each time (`items/<id>/<uuid>.webp`). After the dish points
  at the new photo, the old object is deleted. An object is never overwritten, because `/img`
  responses are cached as immutable for a year.

How saving works:

- A dish and its variants are saved **in one D1 batch**, which D1 runs as a single transaction:
  all of it or none of it. Existing variants keep their ids, because guests' baskets refer to them.
  Every dish keeps at least one variant (checked by the app).
- Reordering rewrites `sort_order` as 1, 2, 3… for that list, in one batch.
- After every change the admin **purges `/kk` and `/ru` from Cloudflare's cache** (see below) and
  says whether guests see the change right away or within a minute.
- All forms are validated on the server (`src/lib/server/admin/forms.ts`); errors are shown next to
  the fields in the admin's language.

### Who can open it

Every request under `/admin` (pages, form submissions, data requests) is checked in
`src/hooks.server.ts` before anything else runs. In production it needs a valid Cloudflare Access
token: the `Cf-Access-Jwt-Assertion` header, signed (RS256) by your team's keys, for this
application's AUD, not expired. The check is in the Worker as well as in Access because the Worker
can also be reached where Access does not apply: on a hostname that is not in the Access
application (such as a custom domain added later), or through a spelling of the path that Access
might not match. If `ACCESS_TEAM_DOMAIN` or `ACCESS_AUD` is empty, `/admin` answers 503 rather
than opening up. In `npm run dev` the check is skipped.

### Setting up Cloudflare Access

This is already done for the live site: team domain `quiet-thunder-8c55.cloudflareaccess.com`,
application **Rasel menu admin**, covering `/admin` on
`rasel-kitchen-menu.rasel-kitchen-menu.workers.dev`. The steps below are how it was set up, for
reference or a fresh account.

Don't use the **Enable Cloudflare Access** switch on the Worker's own settings page: it puts the
whole site behind the login, the menu included.

1. Open **Cloudflare One** (Cloudflare dashboard → **Zero Trust**). The first time, it asks you to
   pick a **team name**, which gives the team domain `<team>.cloudflareaccess.com`, and a plan.
   The **Free** plan (up to 50 users) is enough. It may ask for a payment method even for the free
   plan.
2. **Login method.** Go to **Integrations → Identity providers**. If **One-time PIN** (a code sent
   by email) is not in the list, click **Add an identity provider → One-time PIN**. One-time PIN is
   only automatic while no other login method exists, and a new account may already have the
   **Cloudflare** one (sign in with a Cloudflare account).
3. **Create the application.** Go to **Access controls → Applications → Create new application →
   Self-hosted**.
   - Name: `Rasel menu admin`. Session duration: 1 week.
   - Public hostnames, two of them, both with subdomain `rasel-kitchen-menu` and domain
     `rasel-kitchen-menu.workers.dev`: one with path `admin`, one with path `admin/*`.
   - Policy: **Create new policy**, named e.g. `Menu editors`, action **Allow**, a rule **Include →
     Emails** with the addresses that may edit the menu.
   - Login methods: accept all available identity providers.
4. **Copy two values:**
   - the **Application Audience (AUD) Tag**: open the application → **Additional settings → AUD
     tag**;
   - the **team domain**: Cloudflare One → **Overview → Account details**.
5. Put them into `wrangler.jsonc` (neither is a secret):

   ```jsonc
   "vars": {
   	"ACCESS_TEAM_DOMAIN": "<team>.cloudflareaccess.com",
   	"ACCESS_AUD": "the-long-aud-tag"
   },
   ```

   then `npm run deploy`.

6. **Test:** open `/admin` in a private window. Access asks for an email and sends a code to it;
   after that the admin panel opens, with your email at the bottom. An email that is not in the
   policy is refused by Access.

To sign out, use **Шығу / Выйти** at the bottom of the admin pages.

#### Adding or removing an editor

**Access controls → Applications → Rasel menu admin →** the **Menu editors** policy → edit the
**Emails** list → Save. It applies at the next login; no deploy needed.

#### When you add a custom domain

Add the domain to the same application: **Access controls → Applications → Rasel menu admin → Add
public hostname** with your domain and path `admin`, then once more with path `admin/*`. The AUD
tag stays the same, so there is nothing to deploy. Until then, `/admin` on the new domain answers 403.

Optional: once the custom domain works, set `"workers_dev": false` in `wrangler.jsonc` so the menu
is only served on your domain.

### Cache purge after saves

The menu pages are cached at the edge for 60 seconds. Clearing the cache with
`caches.default.delete` would only clear one Cloudflare data center, so the admin uses Cloudflare's
**purge-by-URL API** for `https://<your domain>/kk` and `/ru`. This needs two Worker secrets:

1. **Zone ID**: Cloudflare dashboard → your domain → Overview, in the right column ("API → Zone
   ID").
2. **API token**: My Profile → API Tokens → **Create Token** → **Create Custom Token**.
   Permissions: **Zone · Cache Purge · Purge**. Zone resources: **Include → Specific zone → your
   domain**. Create it and copy the token (it is shown once).
3. Store both as secrets (they never go in `wrangler.jsonc` or git):

   ```bash
   npx wrangler secret put CLOUDFLARE_ZONE_ID
   npx wrangler secret put CLOUDFLARE_API_TOKEN
   ```

Secrets take effect immediately, with no redeploy. If they are missing or the API call fails, the
save still succeeds and the admin says the menu updates within a minute. On `workers.dev` and in
local dev there is no edge cache, so nothing is purged.

Only `/kk` and `/ru` are purged. If your QR codes carry a query string (e.g. `/?table=5`), those
cached copies are separate URLs and simply expire within 60 seconds.
