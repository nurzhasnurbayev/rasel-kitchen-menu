import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Db = ReturnType<typeof createDb>;

function createDb(d1: D1Database) {
	return drizzle(d1, { schema });
}

/**
 * Drizzle client for the D1 binding `DB` of the current request.
 *
 * `platform` comes from the request event. In production the Worker runtime provides it;
 * in `npm run dev` the Cloudflare adapter emulates it with a local D1 database in .wrangler/.
 */
export function getDb(platform: App.Platform | undefined): Db {
	const d1 = platform?.env?.DB;
	if (!d1) {
		throw new Error(
			'D1 binding "DB" is missing. Check d1_databases in wrangler.jsonc and start the app with `npm run dev` or `npm run preview`.'
		);
	}
	return createDb(d1);
}
