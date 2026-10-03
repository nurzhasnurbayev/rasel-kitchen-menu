// See https://svelte.dev/docs/kit/types#app.d.ts
import type { D1Database, Fetcher, R2Bucket } from '@cloudflare/workers-types';

declare global {
	/** Cloudflare bindings available on `platform.env`. Keep in sync with wrangler.jsonc. */
	interface Env {
		/** D1 database with the menu (d1_databases → binding "DB"). */
		DB: D1Database;
		/** R2 bucket with dish photos (r2_buckets → binding "PHOTOS"). */
		PHOTOS: R2Bucket;
		/** The Worker's static assets (assets → binding "ASSETS"). Used by the adapter. */
		ASSETS: Fetcher;
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}

		// `ctx`, `caches` and `cf` are declared by @sveltejs/adapter-cloudflare.
		interface Platform {
			env: Env;
		}
	}
}

export {};
