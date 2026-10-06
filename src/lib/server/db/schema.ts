import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/*
 * Menu schema. Every guest-facing text has a Kazakh (`_kk`) and a Russian (`_ru`) column.
 * Prices are whole tenge. The cafe's contact details are in `cafe_info`.
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

/**
 * The cafe's contact details: shown in the menu's header and footer, edited in the admin panel
 * (/admin/cafe). A single row with id 1, created by the first save. Null means "not filled in":
 * the menu then leaves that line out.
 */
export const cafeInfo = sqliteTable(
	'cafe_info',
	{
		id: integer('id').primaryKey(),
		addressKk: text('address_kk'),
		addressRu: text('address_ru'),
		/** Opening hours as free text, e.g. "Күн сайын 10:00–22:00". */
		hoursKk: text('hours_kk'),
		hoursRu: text('hours_ru'),
		/** As it should be shown, e.g. "+7 700 000 00 00"; the tap-to-call link uses its digits. */
		phone: text('phone'),
		/** Link to the cafe's page on 2GIS. */
		twoGisUrl: text('two_gis_url'),
		/** Notes for guests, one per line, e.g. "Обслуживание 10%". */
		notesKk: text('notes_kk'),
		notesRu: text('notes_ru')
	},
	(t) => [
		check('cafe_info_single_row', sql`id = 1`),
		// Like variant labels: given in both languages or in neither.
		check('cafe_info_address_both_or_none', sql`(address_kk IS NULL) = (address_ru IS NULL)`),
		check('cafe_info_hours_both_or_none', sql`(hours_kk IS NULL) = (hours_ru IS NULL)`),
		check('cafe_info_notes_both_or_none', sql`(notes_kk IS NULL) = (notes_ru IS NULL)`)
	]
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Variant = typeof variants.$inferSelect;
export type NewVariant = typeof variants.$inferInsert;
export type CafeInfoRow = typeof cafeInfo.$inferSelect;
