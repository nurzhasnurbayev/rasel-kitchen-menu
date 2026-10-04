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

		/** Cloudflare Access team domain, e.g. "rasel.cloudflareaccess.com" (vars in wrangler.jsonc). */
		ACCESS_TEAM_DOMAIN?: string;
		/** Application Audience (AUD) tag of the Access application for /admin (vars). */
		ACCESS_AUD?: string;
		/** The menu's domain, e.g. "rasel-kitchen.app" (vars). www. and workers.dev redirect to it. */
		CANONICAL_HOST?: string;
		/** Secret: API token with Zone → Cache Purge permission, to purge /kk and /ru after saves. */
		CLOUDFLARE_API_TOKEN?: string;
		/** ID of the zone (domain) the menu is served on (vars; not a secret). */
		CLOUDFLARE_ZONE_ID?: string;
	}

	namespace App {
		// interface Error {}
		interface Locals {
			/** Set for /admin requests that passed the Access check (email is null in local dev). */
			admin?: { email: string | null };
		}
		// interface PageData {}
		// interface PageState {}

		// `ctx`, `caches` and `cf` are declared by @sveltejs/adapter-cloudflare.
		interface Platform {
			env: Env;
		}
	}
}

export {};
