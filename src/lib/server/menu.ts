import { asc, eq } from 'drizzle-orm';
import type { Lang } from '$lib/i18n';
import type { CafeInfo, MenuCategory } from '$lib/menu/types';
import type { Database } from './db';
import { cafeInfo, categories, items, variants } from './db/schema';

/** One row of the menu query: a variant joined with its item and category. */
export interface MenuRow {
	categoryId: number;
	categoryName: string;
	itemId: number;
	itemName: string;
	description: string | null;
	photoKey: string | null;
	available: boolean;
	variantId: number | null;
	label: string | null;
	price: number | null;
}

/** Everything the public menu page shows, in one language. */
export interface MenuPage {
	menu: MenuCategory[];
	cafe: CafeInfo;
}

/**
 * Loads the public menu page in one language: the menu (one query with joins) and the cafe's
 * contact details, both sent to D1 at the same time.
 *
 * They are not sent as one `db.batch`: D1 returns batch rows keyed by column name, and Drizzle
 * then mixes up joined columns that share a name (`id`, `name_kk`, …).
 *
 * Hidden categories are skipped, and so are categories without items. Unavailable items
 * are kept so the page can show them as sold out.
 */
export async function getMenuPage(db: Database, lang: Lang): Promise<MenuPage> {
	const kk = lang === 'kk';

	const [rows, cafeRows] = await Promise.all([
		db
			.select({
				categoryId: categories.id,
				categoryName: kk ? categories.nameKk : categories.nameRu,
				itemId: items.id,
				itemName: kk ? items.nameKk : items.nameRu,
				description: kk ? items.descriptionKk : items.descriptionRu,
				photoKey: items.photoKey,
				available: items.available,
				variantId: variants.id,
				label: kk ? variants.labelKk : variants.labelRu,
				price: variants.price
			})
			.from(categories)
			.innerJoin(items, eq(items.categoryId, categories.id))
			.leftJoin(variants, eq(variants.itemId, items.id))
			.where(eq(categories.visible, true))
			.orderBy(
				asc(categories.sortOrder),
				asc(categories.id),
				asc(items.sortOrder),
				asc(items.id),
				asc(variants.sortOrder),
				asc(variants.id)
			),
		db
			.select({
				address: kk ? cafeInfo.addressKk : cafeInfo.addressRu,
				hours: kk ? cafeInfo.hoursKk : cafeInfo.hoursRu,
				phone: cafeInfo.phone,
				twoGisUrl: cafeInfo.twoGisUrl
			})
			.from(cafeInfo)
			.where(eq(cafeInfo.id, 1))
	]);

	const saved = cafeRows[0];
	return {
		menu: groupMenu(rows),
		// No row yet (nothing saved in the admin panel) reads the same as an empty one.
		cafe: {
			address: saved?.address?.trim() || null,
			hours: saved?.hours?.trim() || null,
			phone: saved?.phone?.trim() || null,
			twoGisUrl: saved?.twoGisUrl?.trim() || null
		}
	};
}

/**
 * Folds the flat, ordered rows into categories → items → variants.
 * Relies on the ORDER BY above: rows of one category (and of one item) are contiguous.
 */
export function groupMenu(rows: MenuRow[]): MenuCategory[] {
	const menu: MenuCategory[] = [];
	let category: MenuCategory | undefined;
	let item: MenuCategory['items'][number] | undefined;

	for (const row of rows) {
		if (category?.id !== row.categoryId) {
			category = { id: row.categoryId, name: row.categoryName, items: [] };
			menu.push(category);
			item = undefined;
		}
		if (item?.id !== row.itemId) {
			item = {
				id: row.itemId,
				name: row.itemName,
				description: row.description?.trim() || null,
				photoKey: row.photoKey || null,
				available: row.available,
				variants: []
			};
			category.items.push(item);
		}
		if (row.variantId !== null) {
			item.variants.push({ id: row.variantId, label: row.label?.trim() || null, price: row.price });
		}
	}

	return menu;
}
