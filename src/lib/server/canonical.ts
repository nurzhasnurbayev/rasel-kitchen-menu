/**
 * The menu has one public address: the cafe's own domain (CANONICAL_HOST in wrangler.jsonc).
 * Visits to its www. form or to the Worker's workers.dev address are sent there, so QR codes,
 * shared links, search results and admin logins all use the same address.
 *
 * Returns the URL to redirect to, or null to serve the request as it is. Other hosts (localhost in
 * `npm run dev`) are never redirected. Plain HTTP on the domain itself is left alone too: browsers
 * only open .app domains over HTTPS anyway, and `npm run preview` (wrangler dev) presents local
 * requests as http://<the domain>/…, so redirecting those would loop.
 */
export function canonicalUrl(url: URL, canonicalHost: string | undefined): URL | null {
	const host = canonicalHost?.trim().toLowerCase();
	if (!host) return null;

	const current = url.hostname.toLowerCase();
	if (current !== `www.${host}` && !current.endsWith('.workers.dev')) return null;

	// Only the scheme and host change. (Resolving the path against the domain instead would let a
	// path like //example.com send visitors to another site.)
	const target = new URL(url.href);
	target.protocol = 'https:';
	target.hostname = host;
	target.port = '';
	return target;
}
