import { dev } from '$app/environment';
import { DEFAULT_LANG, isLang, LANG_COOKIE } from '$lib/i18n';
import { takeFlash } from '$lib/server/admin/flash';
import type { LayoutServerLoad } from './$types';

// Access is checked for every /admin request in hooks.server.ts (before loads and form actions).
export const load: LayoutServerLoad = ({ cookies, locals, url }) => {
	// Reading the path makes this load run on every admin navigation, so a message is shown once.
	void url.pathname;
	const saved = cookies.get(LANG_COOKIE);
	return {
		lang: isLang(saved) ? saved : DEFAULT_LANG,
		email: locals.admin?.email ?? null,
		dev,
		flash: takeFlash(cookies)
	};
};
