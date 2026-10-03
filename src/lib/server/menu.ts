import { asc, eq } from 'drizzle-orm';
import type { Lang } from '$lib/i18n';
import type { MenuCategory } from '$lib/menu/types';
import type { Db } from './db';
import { categories, items, variants } from './db/schema';

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

/**
 * Loads the public menu in one language with a single query.
 *
 * Hidden categories are skipped, and so are categories without items. Unavailable items
 * are kept so the page can show them as sold out.
 */
export async function getMenu(db: Db, lang: Lang): Promise<MenuCategory[]> {
	const kk = lang === 'kk';

	const rows = await db
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
		);

	return groupMenu(rows);
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
