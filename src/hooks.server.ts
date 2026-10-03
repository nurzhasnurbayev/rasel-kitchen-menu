import type { Handle } from '@sveltejs/kit';
import { DEFAULT_LANG, isLang, LANG_COOKIE } from '$lib/i18n';

export const handle: Handle = async ({ event, resolve }) => {
	// <html lang> follows the route (/kk, /ru); other pages (e.g. 404s) use the saved choice.
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

	return response;
};
