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
