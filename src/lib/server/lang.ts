import { DEFAULT_LANG, isLang, type Lang } from '$lib/i18n';

/**
 * Picks the menu language for a visitor of `/`:
 * 1. the `lang` cookie (an explicit choice made with the КЗ / РУ switcher),
 * 2. otherwise the best supported match in the Accept-Language header,
 * 3. otherwise Kazakh.
 */
export function negotiateLang(cookieLang: string | undefined, acceptLanguage: string | null): Lang {
	if (isLang(cookieLang)) return cookieLang;
	return matchAcceptLanguage(acceptLanguage) ?? DEFAULT_LANG;
}

/** Best supported language in an Accept-Language header such as "ru-RU,ru;q=0.9,en;q=0.8". */
export function matchAcceptLanguage(header: string | null): Lang | null {
	if (!header) return null;

	const ranges = header
		.split(',')
		.map((part, index) => {
			const [tag = '', ...params] = part.split(';').map((s) => s.trim());
			const q = params.find((p) => p.startsWith('q='));
			const weight = q === undefined ? 1 : Number(q.slice(2));
			return { tag: tag.toLowerCase(), weight: Number.isFinite(weight) ? weight : 0, index };
		})
		.filter((range) => range.tag && range.weight > 0)
		// Highest weight first; equal weights keep the order the browser sent them in.
		.sort((a, b) => b.weight - a.weight || a.index - b.index);

	for (const { tag } of ranges) {
		const primary = tag.split('-')[0];
		// "kz" is the country code, not a language code, but some devices send it for Kazakh.
		const lang = primary === 'kz' ? 'kk' : primary;
		if (isLang(lang)) return lang;
	}
	return null;
}
