import type { Lang } from './i18n';

/**
 * Cafe details shown in the header and footer.
 *
 * TODO: replace every placeholder below with the real values.
 */
export const cafe: CafeConfig = {
	name: 'Rasel Kitchen', // TODO: confirm the exact spelling of the cafe name

	// Path to a logo file in /static (e.g. '/logo.svg' or '/logo.png'), or null to show a letter monogram.
	logo: null,

	address: {
		kk: 'Қала, көше, үй', // TODO: e.g. 'Алматы қ., Абай даңғылы, 1'
		ru: 'Город, улица, дом' // TODO: e.g. 'г. Алматы, пр. Абая, 1'
	},

	hours: {
		kk: 'Күн сайын 10:00–22:00', // TODO
		ru: 'Ежедневно 10:00–22:00' // TODO
	},

	// Shown exactly as written; the tap-to-call link is built from its digits.
	phone: '+7 700 000 00 00', // TODO

	// In the 2GIS app: open the cafe → Share → Copy link.
	twoGisUrl: 'https://2gis.kz/' // TODO
};

export interface CafeConfig {
	name: string;
	logo: string | null;
	address: Record<Lang, string>;
	hours: Record<Lang, string>;
	phone: string;
	twoGisUrl: string;
}

/** `tel:` link for a human-readable phone number: '+7 700 000 00 00' → 'tel:+77000000000'. */
export function telHref(phone: string): string {
	return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
