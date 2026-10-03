import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/*
 * Menu schema. Every guest-facing text has a Kazakh (`_kk`) and a Russian (`_ru`) column.
 * Prices are whole tenge.
 *
 * After changing this file run `npm run db:generate` to create a migration in drizzle/migrations.
 *
 * CHECK constraints use bare column names on purpose: drizzle-kit copies them verbatim when it
 * has to rebuild a SQLite table, and a table-qualified name would break that rebuild.
 */

export const categories = sqliteTable(
	'categories',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		nameKk: text('name_kk').notNull(),
		nameRu: text('name_ru').notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		/** Hidden categories (and their items) are not rendered on the public menu. */
		visible: integer('visible', { mode: 'boolean' }).notNull().default(true)
	},
	(t) => [check('categories_visible_bool', sql`visible IN (0, 1)`)]
);

export const items = sqliteTable(
	'items',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		// No ON DELETE action: a category that still has items cannot be deleted.
		categoryId: integer('category_id')
			.notNull()
			.references(() => categories.id),
		nameKk: text('name_kk').notNull(),
		nameRu: text('name_ru').notNull(),
		descriptionKk: text('description_kk'),
		descriptionRu: text('description_ru'),
		/** R2 object key in the PHOTOS bucket, served at /img/<key>. Null means no photo. */
		photoKey: text('photo_key'),
		/** Unavailable items stay on the menu, greyed out with a "sold out" badge. */
		available: integer('available', { mode: 'boolean' }).notNull().default(true),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(t) => [
		index('items_category_sort_idx').on(t.categoryId, t.sortOrder),
		check('items_available_bool', sql`available IN (0, 1)`)
	]
);

/**
 * Every item has at least one variant (enforced by the app, not the database).
 * A single-price item has one variant with null labels; sized items (1 л / 0,5 л)
 * have one variant per size.
 */
export const variants = sqliteTable(
	'variants',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		itemId: integer('item_id')
			.notNull()
			.references(() => items.id, { onDelete: 'cascade' }),
		labelKk: text('label_kk'),
		labelRu: text('label_ru'),
		/** Whole tenge. Null means "price on request". */
		price: integer('price'),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(t) => [
		index('variants_item_sort_idx').on(t.itemId, t.sortOrder),
		check('variants_price_non_negative', sql`price IS NULL OR price >= 0`),
		// A label is either given in both languages or in neither.
		check('variants_label_both_or_none', sql`(label_kk IS NULL) = (label_ru IS NULL)`)
	]
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Variant = typeof variants.$inferSelect;
export type NewVariant = typeof variants.$inferInsert;
