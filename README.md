# Rasel Kitchen — QR menu

A bilingual (Kazakh / Russian) menu that guests open on their phones by scanning the QR code on
their table. This is v1: the public menu. An admin panel for editing the menu comes next.

- `/kk` and `/ru` are the menu pages; `/` sends guests to the right one.
- Server-rendered from Cloudflare D1, cached at the edge, readable with JavaScript disabled.
- Dish photos are supported (served from Cloudflare R2), but every dish starts without one.

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

`npm run preview` builds the app and runs the real Worker with `wrangler dev`
(http://localhost:8787), edge cache included. It uses the same local database.

## Deploy to Cloudflare (one-time setup)

Run these yourself; they act on your Cloudflare account.

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

3. **Create the R2 bucket for photos.** There's no ID to paste: the bucket name is already in
   `wrangler.jsonc`. Again, answer **no** if asked to update the config.

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
   root URL, e.g. `https://menu.example.kz/`.

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

The database also has some guard rails. Prices can't be negative. A variant label must be given
in both languages or in neither. A category that still has items can't be deleted.

### Seeding

The opening menu is `drizzle/migrations/0001_seed_menu.sql`, so **seeding is part of applying
migrations**:

- locally: `npm run db:migrate:local` (or `npm run db:reset:local` to start over)
- production: `npm run db:migrate:remote`

Wrangler records applied migrations in the `d1_migrations` table, so each database gets the seed
exactly once. Running the remote migrate command again later can never overwrite menu changes.

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

### Editing data before the admin panel exists

```bash
npx wrangler d1 execute DB --remote --command "UPDATE items SET available = 0 WHERE id = 3"
npx wrangler d1 execute DB --local  --command "SELECT id, name_ru FROM items"
```

Changes show up on the site within about a minute, the edge cache lifetime.

## How it works

**Languages.** Routes are `/kk` and `/ru` (`src/routes/[lang=lang]`; anything else is a 404). `/`
redirects to the language in the `lang` cookie, otherwise to the best match in the browser's
`Accept-Language`, otherwise to Kazakh. The КЗ / РУ switch is a normal link. With JavaScript it
also saves the choice in the cookie and opens the other language at the same dish
(`/ru#item-12`). `<html lang>` is set per route, and the pages carry `hreflang` alternates and a
canonical link. Interface strings live in `src/lib/i18n.ts`, a small typed dictionary.

**Rendering and caching.** `src/routes/[lang=lang]/+page.server.ts` loads the menu with one SQL
query (joins, no N+1) and sends `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
The adapter's Worker stores such responses in Cloudflare's edge cache, so most guests never hit
D1. Edge caching has three limits:

- it only works on a custom domain;
- the cache is per data center;
- Cloudflare's Workers cache ignores `stale-while-revalidate`, so in practice it is a 60-second
  cache.

The language redirect at `/` is never cached.

**Very little JavaScript.** The menu page sets `csr = false`, so it ships none of SvelteKit's
client runtime. Instead, `src/lib/menu/enhance.js` (about 1.3 KB gzipped) is minified at build
time and inlined at the end of the page. It adds three things:

- smooth scrolling for the sticky category tabs;
- highlighting the tab of the section on screen (IntersectionObserver);
- the language-switch behaviour above.

Without JavaScript the tabs are plain anchor links and everything stays readable. Motion respects
`prefers-reduced-motion`. The CSS (about 22 KB) is inlined, and the two fonts are preloaded, so the
first visit needs only the HTML and two font files.

**Photos.** `GET /img/<key>` streams the R2 object `<key>` with a one-year immutable cache
header and ETag support. Images on the menu are lazy-loaded. Because of the immutable caching,
**never overwrite a photo in place**: upload new photos under new keys, e.g.
`items/12/<random>.webp`.

**Fonts.** The `.woff2` files in `src/lib/assets/fonts/` are built by
`scripts/build-fonts.py` (`pip install fonttools brotli`). Each file is trimmed to Latin,
Russian, Kazakh, ₸ and common punctuation. That gives one file per family (32 KB and 30 KB),
where Google Fonts would serve four. Both fonts are under the SIL Open Font License; the licence
files sit next to the fonts.

## Customising

- **Cafe details** (name, logo, address, hours, phone, 2GIS link): `src/lib/config.ts`. All
  values there are placeholders.
- **Logo**: put a file in `static/` (e.g. `static/logo.svg`) and set `logo: '/logo.svg'` in
  `config.ts`. Replace `static/favicon.svg` too.
- **Interface text** (both languages): `src/lib/i18n.ts`
- **Colours and fonts**: `src/app.css` (light and dark palettes; all text colours meet WCAG AA
  contrast)

## Project structure

```
├── drizzle/migrations/          SQL migrations (0000 schema, 0001 menu seed) + drizzle-kit metadata
├── scripts/build-fonts.py       Builds the subset web fonts
├── src/
│   ├── app.css                  Tailwind, fonts, colour palette
│   ├── app.d.ts                 App.Platform / Env typing for the Cloudflare bindings
│   ├── app.html
│   ├── hooks.server.ts          <html lang>, font preloading, security headers
│   ├── params/lang.ts           Route matcher: only kk | ru
│   ├── lib/
│   │   ├── config.ts            Cafe details (placeholders to fill in)
│   │   ├── i18n.ts              Languages + UI dictionary
│   │   ├── format.ts            Price formatting ("2 000 ₸")
│   │   ├── photos.ts            R2 photo keys → /img URLs
│   │   ├── assets/fonts/        Self-hosted fonts + licences
│   │   ├── menu/                Public menu: components, types, enhance.js
│   │   └── server/
│   │       ├── db/              Drizzle schema + D1 client
│   │       ├── menu.ts          Menu query (one query, grouped in code)
│   │       └── lang.ts          Accept-Language / cookie negotiation
│   └── routes/
│       ├── +server.ts           "/" → /kk or /ru
│       ├── [lang=lang]/         The menu page
│       ├── img/[...key]/        Photos from R2
│       └── +error.svelte        Bilingual 404 / error page
├── static/                      favicon, robots.txt
├── drizzle.config.ts            drizzle-kit (generates migrations only)
├── svelte.config.js
├── vite.config.ts               Includes the small plugin that minifies the inline script
└── wrangler.jsonc               Worker config and bindings: DB (D1), PHOTOS (R2), ASSETS
```

## Next: admin panel

Planned as `/admin`, protected by Cloudflare Access, for editing categories, items, variants and
photos. The code is laid out for it:

- **Routes and components.** Admin routes go in `src/routes/admin/`; client-side rendering stays
  on there by default. Admin components can live in `src/lib/admin/`.
- **Shared code.** The schema types (`Item`, `NewItem`, …) and `getDb(platform)` are ready to
  reuse.
- **After a save,** purge `https://<domain>/kk` and `/ru` with the Cloudflare purge-by-URL API,
  or wait up to 60 seconds.
