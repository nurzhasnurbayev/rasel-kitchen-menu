import { and, asc, eq, notInArray, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { Database } from '../db';
import {
	cafeInfo,
	categories,
	items,
	variants,
	type CafeInfoRow,
	type Category,
	type Item,
	type Variant
} from '../db/schema';
import type { CafeInput, CategoryInput, ItemInput } from './forms';

/**
 * Reads and writes for the admin panel.
 *
 * Every write that touches more than one row goes through `db.batch`, which D1 runs as a single
 * transaction: an item and its variants are saved completely or not at all.
 */

/** The D1 client in production; an SQLite-backed one in tests. */
export type AdminDb = Database;

type Statement = BatchItem<'sqlite'>;
const asBatch = (statements: Statement[]) => statements as [Statement, ...Statement[]];

export interface AdminItem extends Item {
	variants: Variant[];
}

export interface AdminCategory extends Category {
	items: AdminItem[];
}

const categoryOrder = [asc(categories.sortOrder), asc(categories.id)];
const itemOrder = [asc(items.sortOrder), asc(items.id)];
const variantOrder = [asc(variants.sortOrder), asc(variants.id)];

/** Every category (hidden ones too) with every item and variant, in menu order. */
export async function getAdminMenu(db: AdminDb): Promise<AdminCategory[]> {
	const [categoryRows, itemRows, variantRows] = await db.batch([
		db
			.select()
			.from(categories)
			.orderBy(...categoryOrder),
		db
			.select()
			.from(items)
			.orderBy(...itemOrder),
		db
			.select()
			.from(variants)
			.orderBy(...variantOrder)
	]);

	const itemsById = new Map<number, AdminItem>();
	const byCategory = new Map<number, AdminItem[]>();
	for (const row of itemRows) {
		const item = { ...row, variants: [] };
		itemsById.set(item.id, item);
		byCategory.set(item.categoryId, [...(byCategory.get(item.categoryId) ?? []), item]);
	}
	for (const variant of variantRows) itemsById.get(variant.itemId)?.variants.push(variant);

	return categoryRows.map((category) => ({
		...category,
		items: byCategory.get(category.id) ?? []
	}));
}

export async function getCategories(db: AdminDb): Promise<Category[]> {
	return db
		.select()
		.from(categories)
		.orderBy(...categoryOrder);
}

export async function getItem(db: AdminDb, id: number): Promise<AdminItem | null> {
	const [itemRows, variantRows] = await db.batch([
		db.select().from(items).where(eq(items.id, id)),
		db
			.select()
			.from(variants)
			.where(eq(variants.itemId, id))
			.orderBy(...variantOrder)
	]);
	return itemRows[0] ? { ...itemRows[0], variants: variantRows } : null;
}

// --- Categories ---------------------------------------------------------------------------------

export async function createCategory(db: AdminDb, input: CategoryInput): Promise<number> {
	const [row] = await db
		.insert(categories)
		.values({
			...input,
			sortOrder: sql`(SELECT coalesce(max(sort_order), 0) + 1 FROM categories)`
		})
		.returning({ id: categories.id });
	return row.id;
}

/** @returns false if the category does not exist */
export async function updateCategory(db: AdminDb, id: number, input: CategoryInput) {
	const rows = await db
		.update(categories)
		.set(input)
		.where(eq(categories.id, id))
		.returning({ id: categories.id });
	return rows.length > 0;
}

/** Only an empty category can be deleted: dishes are never deleted as a side effect. */
export async function deleteCategory(
	db: AdminDb,
	id: number
): Promise<'deleted' | 'not-empty' | 'not-found'> {
	const [used] = await db
		.select({ id: items.id })
		.from(items)
		.where(eq(items.categoryId, id))
		.limit(1);
	if (used) return 'not-empty';
	try {
		const rows = await db
			.delete(categories)
			.where(eq(categories.id, id))
			.returning({ id: categories.id });
		return rows.length ? 'deleted' : 'not-found';
	} catch (error) {
		// An item was added in the meantime: the foreign key refuses the delete.
		if (String(error).includes('FOREIGN KEY')) return 'not-empty';
		throw error;
	}
}

// --- Ordering -----------------------------------------------------------------------------------

/**
 * Moves `id` one place up (-1) or down (+1) in `ids`. Returns the new order, or null if it cannot
 * move (not found, or already first/last).
 */
export function moveInList(ids: number[], id: number, direction: -1 | 1): number[] | null {
	const from = ids.indexOf(id);
	const to = from + direction;
	if (from === -1 || to < 0 || to >= ids.length) return null;
	const moved = [...ids];
	[moved[from], moved[to]] = [moved[to], moved[from]];
	return moved;
}

/** Rewrites sort_order as 1, 2, 3… in the given order (only rows that change). */
function sortOrderUpdates<T extends typeof categories | typeof items>(
	db: AdminDb,
	table: T,
	rows: { id: number; sortOrder: number }[],
	order: number[]
): Statement[] {
	const current = new Map(rows.map((row) => [row.id, row.sortOrder]));
	return order
		.map((id, index) => ({ id, sortOrder: index + 1 }))
		.filter(({ id, sortOrder }) => current.get(id) !== sortOrder)
		.map(({ id, sortOrder }) =>
			db
				.update(table as typeof categories)
				.set({ sortOrder })
				.where(eq((table as typeof categories).id, id))
		);
}

/** @returns false if it could not move */
export async function moveCategory(db: AdminDb, id: number, direction: -1 | 1) {
	const rows = await db
		.select({ id: categories.id, sortOrder: categories.sortOrder })
		.from(categories)
		.orderBy(...categoryOrder);
	const order = moveInList(
		rows.map((row) => row.id),
		id,
		direction
	);
	if (!order) return false;
	await db.batch(asBatch(sortOrderUpdates(db, categories, rows, order)));
	return true;
}

/** Moves an item within its category. @returns false if it could not move */
export async function moveItem(db: AdminDb, id: number, direction: -1 | 1) {
	const rows = await db
		.select({ id: items.id, sortOrder: items.sortOrder })
		.from(items)
		.where(eq(items.categoryId, sql`(SELECT category_id FROM items WHERE id = ${id})`))
		.orderBy(...itemOrder);
	const order = moveInList(
		rows.map((row) => row.id),
		id,
		direction
	);
	if (!order) return false;
	await db.batch(asBatch(sortOrderUpdates(db, items, rows, order)));
	return true;
}

// --- Items --------------------------------------------------------------------------------------

/** Puts an item last in a category. */
const endOfCategory = (categoryId: number) =>
	sql<number>`(SELECT coalesce(max(sort_order), 0) + 1 FROM items WHERE category_id = ${categoryId})`;

const itemFields = (input: ItemInput) => ({
	categoryId: input.categoryId,
	nameKk: input.nameKk,
	nameRu: input.nameRu,
	descriptionKk: input.descriptionKk,
	descriptionRu: input.descriptionRu,
	available: input.available
});

/** Creates an item and its variants in one transaction. @returns the new item's id */
export async function createItem(db: AdminDb, input: ItemInput): Promise<number> {
	const [inserted] = await db.batch([
		db
			.insert(items)
			.values({ ...itemFields(input), sortOrder: endOfCategory(input.categoryId) })
			.returning({ id: items.id }),
		// Same transaction, and ids only grow (AUTOINCREMENT): the newest item is the one above.
		db.insert(variants).values(
			input.variants.map((variant, index) => ({
				itemId: sql<number>`(SELECT max(id) FROM items)`,
				labelKk: variant.labelKk,
				labelRu: variant.labelRu,
				price: variant.price,
				sortOrder: index + 1
			}))
		)
	]);
	return inserted[0].id;
}

/**
 * Saves an item and its variants in one transaction. Existing variants keep their ids (guests'
 * baskets refer to them); variants left out of `input` are deleted; ids that do not belong to the
 * item are added as new variants.
 *
 * @returns false if the item does not exist
 */
export async function updateItem(db: AdminDb, id: number, input: ItemInput): Promise<boolean> {
	const [itemRows, variantRows] = await db.batch([
		db.select({ categoryId: items.categoryId }).from(items).where(eq(items.id, id)),
		db.select({ id: variants.id }).from(variants).where(eq(variants.itemId, id))
	]);
	if (!itemRows[0]) return false;

	const existing = new Set(variantRows.map((row) => row.id));
	const kept = input.variants.filter((v) => v.id !== null && existing.has(v.id)).map((v) => v.id!);
	const movedCategory = itemRows[0].categoryId !== input.categoryId;

	const statements: Statement[] = [
		db
			.update(items)
			.set({
				...itemFields(input),
				...(movedCategory ? { sortOrder: endOfCategory(input.categoryId) } : {})
			})
			.where(eq(items.id, id)),
		db
			.delete(variants)
			.where(
				kept.length
					? and(eq(variants.itemId, id), notInArray(variants.id, kept))
					: eq(variants.itemId, id)
			)
	];

	const added: (typeof variants.$inferInsert)[] = [];
	input.variants.forEach((variant, index) => {
		const fields = {
			labelKk: variant.labelKk,
			labelRu: variant.labelRu,
			price: variant.price,
			sortOrder: index + 1
		};
		if (variant.id !== null && existing.has(variant.id)) {
			statements.push(
				db
					.update(variants)
					.set(fields)
					.where(and(eq(variants.id, variant.id), eq(variants.itemId, id)))
			);
		} else {
			added.push({ itemId: id, ...fields });
		}
	});
	if (added.length) statements.push(db.insert(variants).values(added));

	await db.batch(asBatch(statements));
	return true;
}

/** @returns false if the item does not exist */
export async function setItemAvailable(db: AdminDb, id: number, available: boolean) {
	const rows = await db
		.update(items)
		.set({ available })
		.where(eq(items.id, id))
		.returning({ id: items.id });
	return rows.length > 0;
}

/**
 * Deletes an item; its variants go with it (ON DELETE CASCADE).
 * @returns the deleted item's photo key (to remove from R2), or undefined if it did not exist
 */
export async function deleteItem(
	db: AdminDb,
	id: number
): Promise<{ photoKey: string | null } | undefined> {
	const [row] = await db
		.delete(items)
		.where(eq(items.id, id))
		.returning({ photoKey: items.photoKey });
	return row;
}

/**
 * Points an item at a new photo (or none). Reading the old key and writing the new one happen in
 * one transaction, so the returned old key is exactly the one replaced.
 * @returns the replaced key, or undefined if the item does not exist
 */
export async function setItemPhoto(
	db: AdminDb,
	id: number,
	photoKey: string | null
): Promise<{ oldKey: string | null } | undefined> {
	const [before] = await db.batch([
		db.select({ photoKey: items.photoKey }).from(items).where(eq(items.id, id)),
		db.update(items).set({ photoKey }).where(eq(items.id, id))
	]);
	return before[0] ? { oldKey: before[0].photoKey } : undefined;
}

// --- Cafe details -------------------------------------------------------------------------------

/** Address, hours, phone and 2GIS link, in both languages. */
export type CafeDetails = Omit<CafeInfoRow, 'id'>;

const CAFE_ROW_ID = 1;

/** The saved details; every field is null until the admin fills it in. */
export async function getCafe(db: AdminDb): Promise<CafeDetails> {
	const [row] = await db.select().from(cafeInfo).where(eq(cafeInfo.id, CAFE_ROW_ID));
	return {
		addressKk: row?.addressKk ?? null,
		addressRu: row?.addressRu ?? null,
		hoursKk: row?.hoursKk ?? null,
		hoursRu: row?.hoursRu ?? null,
		phone: row?.phone ?? null,
		twoGisUrl: row?.twoGisUrl ?? null
	};
}

/** Saves the details: the first save creates the single row, later ones update it. */
export async function saveCafe(db: AdminDb, input: CafeInput): Promise<void> {
	await db
		.insert(cafeInfo)
		.values({ id: CAFE_ROW_ID, ...input })
		.onConflictDoUpdate({ target: cafeInfo.id, set: input });
}
