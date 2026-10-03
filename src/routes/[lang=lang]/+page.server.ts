import { getDb } from '$lib/server/db';
import { getMenu } from '$lib/server/menu';
import type { PageServerLoad } from './$types';

// The menu is plain server-rendered HTML: no SvelteKit client runtime is shipped.
// The small script in $lib/menu/enhance.js adds tab highlighting and the language switch on top.
export const csr = false;

export const load: PageServerLoad = async ({ params, platform, setHeaders }) => {
	const menu = await getMenu(getDb(platform), params.lang);

	// Cached at the edge for 60 s. Admin saves will purge /kk and /ru explicitly.
	setHeaders({ 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' });

	return { lang: params.lang, menu };
};
