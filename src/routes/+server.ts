import { LANG_COOKIE } from '$lib/i18n';
import { negotiateLang } from '$lib/server/lang';
import type { RequestHandler } from './$types';

/**
 * `/` (the URL in the table QR codes) sends guests to /kk or /ru:
 * saved `lang` cookie → Accept-Language → Kazakh.
 */
export const GET: RequestHandler = ({ cookies, request, url }) => {
	const lang = negotiateLang(cookies.get(LANG_COOKIE), request.headers.get('accept-language'));

	return new Response(null, {
		status: 302,
		headers: {
			location: `/${lang}${url.search}`,
			// The answer depends on the visitor, so it must never be stored in a shared cache.
			'cache-control': 'private, no-store',
			vary: 'Cookie, Accept-Language'
		}
	});
};
