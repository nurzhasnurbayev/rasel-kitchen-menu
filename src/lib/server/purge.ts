import { LANGS } from '$lib/i18n';

/**
 * Clears the cached menu pages (/kk, /ru) in every Cloudflare data center after an admin save,
 * with the purge-by-URL API. (`caches.default.delete` would only clear the data center that
 * handled the save.) Without it, guests see the change within 60 s, the edge cache lifetime.
 *
 * Needs two Worker secrets: CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN (permission
 * Zone → Cache Purge → Purge, for the menu's zone).
 * https://developers.cloudflare.com/api/resources/cache/methods/purge/
 */

export type PurgeResult =
	/** The cached pages were cleared. */
	| 'purged'
	/** Nothing to clear: this host has no edge cache (local dev, workers.dev). */
	| 'skipped'
	/** The secrets are missing. */
	| 'not-configured'
	/** Cloudflare refused or did not answer; the pages refresh within 60 s anyway. */
	| 'failed';

export interface PurgeEnv {
	CLOUDFLARE_API_TOKEN?: string;
	CLOUDFLARE_ZONE_ID?: string;
}

/** The public URLs whose cached copies an admin change makes stale. */
export function menuUrls(origin: string): string[] {
	return LANGS.map((lang) => `${origin}/${lang}`);
}

export async function purgeMenu(
	env: PurgeEnv | undefined,
	origin: string,
	fetchFn: typeof fetch = fetch
): Promise<PurgeResult> {
	const { hostname } = new URL(origin);
	if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.workers.dev')) {
		return 'skipped';
	}

	const token = env?.CLOUDFLARE_API_TOKEN?.trim();
	const zone = env?.CLOUDFLARE_ZONE_ID?.trim();
	if (!token || !zone) return 'not-configured';

	try {
		const response = await fetchFn(
			`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zone)}/purge_cache`,
			{
				method: 'POST',
				headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
				body: JSON.stringify({ files: menuUrls(origin) }),
				signal: AbortSignal.timeout(5000)
			}
		);
		const body = (await response.json().catch(() => null)) as {
			success?: boolean;
			errors?: unknown;
		} | null;
		if (response.ok && body?.success) return 'purged';
		console.error('Cache purge failed', response.status, JSON.stringify(body?.errors ?? body));
		return 'failed';
	} catch (error) {
		console.error('Cache purge failed', error);
		return 'failed';
	}
}
