import { dev } from '$app/environment';
import type { Handle, RequestEvent } from '@sveltejs/kit';
import { DEFAULT_LANG, isLang, LANG_COOKIE } from '$lib/i18n';
import { ACCESS_JWT_HEADER, verifyAccessJwt } from '$lib/server/access';

export const handle: Handle = async ({ event, resolve }) => {
	const admin = isAdminRequest(event);
	if (admin) {
		const denied = await authorizeAdmin(event);
		if (denied) return denied;

		// The admin's КЗ / РУ switch: ?lang=ru on any admin page saves the choice and reloads.
		const chosen = event.url.searchParams.get('lang');
		if (isLang(chosen)) {
			const target = new URL(event.url);
			target.searchParams.delete('lang');
			// Same cookie as the menu's switch (enhance.js). Written by hand: cookies.set() only
			// reaches responses made by resolve().
			const secure = event.url.protocol === 'https:' ? '; Secure' : '';
			return new Response(null, {
				status: 303,
				headers: {
					location: target.pathname + target.search,
					'set-cookie': `${LANG_COOKIE}=${chosen}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`,
					'cache-control': 'private, no-store'
				}
			});
		}
	}

	// <html lang> follows the route (/kk, /ru); other pages (admin, 404s) use the saved choice.
	const fromRoute = event.params.lang;
	const fromCookie = event.cookies.get(LANG_COOKIE);
	const lang = isLang(fromRoute) ? fromRoute : isLang(fromCookie) ? fromCookie : DEFAULT_LANG;

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang),
		// Also preload the web fonts so text does not wait for the stylesheet to be parsed.
		preload: ({ type }) => type === 'js' || type === 'css' || type === 'font'
	});

	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('x-frame-options', 'SAMEORIGIN');
	if (admin) {
		// Never store admin pages in the edge cache (or any shared cache), and keep them out of search.
		response.headers.set('cache-control', 'private, no-store');
		response.headers.set('x-robots-tag', 'noindex');
	}

	return response;
};

/**
 * Everything under /admin, including form actions and __data.json requests. Checked on the
 * matched route and on the decoded path, so encoded variants such as /%61dmin are covered too.
 */
function isAdminRequest(event: RequestEvent): boolean {
	const routeId = event.route.id;
	if (routeId === '/admin' || routeId?.startsWith('/admin/')) return true;
	let path = event.url.pathname;
	try {
		path = decodeURIComponent(path);
	} catch {
		/* malformed escapes: check the raw path */
	}
	return /^\/+admin(?:\/|$)/i.test(path);
}

/**
 * Only people let in by Cloudflare Access reach /admin. Returns a response to send instead of the
 * page, or null to continue.
 *
 * In `npm run dev` there is no Access in front of the app, so the check is skipped.
 */
async function authorizeAdmin(event: RequestEvent): Promise<Response | null> {
	if (dev) {
		event.locals.admin = { email: null };
		return null;
	}

	const env = event.platform?.env;
	const teamDomain = env?.ACCESS_TEAM_DOMAIN?.trim();
	const aud = env?.ACCESS_AUD?.trim();
	if (!teamDomain || !aud) {
		// Fail closed: without the settings no token can be checked.
		console.error('Admin is locked: set ACCESS_TEAM_DOMAIN and ACCESS_AUD (see README).');
		return deny(503, 'Әкімші беті бапталмаған / Админка не настроена');
	}

	const token = event.request.headers.get(ACCESS_JWT_HEADER);
	if (!token) return deny(403, 'Кіруге рұқсат жоқ / Доступ запрещён');
	try {
		event.locals.admin = await verifyAccessJwt(token, { teamDomain, aud });
		return null;
	} catch (error) {
		console.warn('Rejected Access token:', error instanceof Error ? error.message : error);
		return deny(403, 'Кіруге рұқсат жоқ / Доступ запрещён');
	}
}

function deny(status: number, message: string) {
	return new Response(message, {
		status,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'private, no-store',
			'x-robots-tag': 'noindex'
		}
	});
}
