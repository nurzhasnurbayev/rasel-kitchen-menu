/** The public menu in a single language, as rendered on /kk and /ru. */

export interface MenuVariant {
	id: number;
	/** Null for an item with a single, unlabelled price. */
	label: string | null;
	/** Whole tenge. Null means "price on request". */
	price: number | null;
}

export interface MenuItem {
	id: number;
	name: string;
	description: string | null;
	photoKey: string | null;
	available: boolean;
	variants: MenuVariant[];
}

export interface MenuCategory {
	id: number;
	name: string;
	items: MenuItem[];
}

/** The cafe's contact details in one language; null where the admin has not filled one in. */
export interface CafeInfo {
	address: string | null;
	hours: string | null;
	/** As it should be shown, e.g. "+7 700 000 00 00". */
	phone: string | null;
	twoGisUrl: string | null;
	/** Notes for guests such as "Обслуживание 10%", one per entry; empty when there are none. */
	notes: string[];
}
