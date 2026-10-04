import { describe, expect, it } from 'vitest';
import { migratedSqlite as migratedDb } from './test-db';

/*
 * Applies the real migration files (schema + menu seed), in order, to an in-memory SQLite
 * database (D1 is SQLite) and checks the seeded menu and the schema's constraints.
 */

const column = (rows: Record<string, unknown>[], name: string) => rows.map((row) => row[name]);

describe('seeded menu', () => {
	const db = migratedDb();

	it('has the six categories in order', () => {
		const rows = db.prepare('SELECT name_kk, name_ru FROM categories ORDER BY sort_order').all();
		expect(rows.map((r) => `${r.name_kk} / ${r.name_ru}`)).toEqual([
			'Бірінші тағамдар / Первые блюда',
			'Екінші тағамдар / Вторые блюда',
			'Гарнирлер / Гарниры',
			'Сусындар / Напитки',
			'Соустар / Соусы',
			'Салаттар / Салаты'
		]);
	});

	it('has every dish, all visible, available and without photos', () => {
		const perCategory = db
			.prepare('SELECT count(*) AS n FROM items GROUP BY category_id ORDER BY category_id')
			.all();
		expect(column(perCategory, 'n')).toEqual([7, 12, 3, 8, 3, 4]);
		expect(db.prepare('SELECT count(*) AS n FROM variants').get()?.n).toBe(40);
		expect(db.prepare('SELECT count(*) AS n FROM categories WHERE visible = 0').get()?.n).toBe(0);
		expect(
			db
				.prepare('SELECT count(*) AS n FROM items WHERE available = 0 OR photo_key IS NOT NULL')
				.get()?.n
		).toBe(0);
	});

	it('gives every item at least one variant', () => {
		const orphans = db
			.prepare(
				'SELECT id FROM items WHERE NOT EXISTS (SELECT 1 FROM variants WHERE item_id = items.id)'
			)
			.all();
		expect(orphans).toEqual([]);
	});

	it('lists sizes and choices as variants of one item', () => {
		const rows = db
			.prepare(
				`SELECT i.name_ru AS item, group_concat(v.label_ru || ': ' || v.price, '; ') AS variants
				FROM items i JOIN variants v ON v.item_id = i.id
				GROUP BY i.id HAVING count(*) > 1 ORDER BY i.id`
			)
			.all();
		expect(rows).toEqual([
			{ item: 'Рис / пюре', variants: 'Рис: 500; Пюре: 500' },
			{ item: 'Компот', variants: '1 л: 900; 0,5 л: 450' },
			{ item: 'Каркаде', variants: '1 л: 900; 0,5 л: 450' }
		]);
	});

	it('marks "price on request" with a null price', () => {
		const rows = db
			.prepare(
				'SELECT i.name_kk FROM items i JOIN variants v ON v.item_id = i.id WHERE v.price IS NULL'
			)
			.all();
		expect(column(rows, 'name_kk')).toEqual(['Тұздалған ассорти (шырынымен)', 'Кимчи']);
	});

	it('stores prices as whole tenge', () => {
		const price = (nameRu: string) =>
			db
				.prepare(
					'SELECT v.price FROM items i JOIN variants v ON v.item_id = i.id WHERE i.name_ru = ?'
				)
				.get(nameRu)?.price;
		expect(price('Бешбармак (с кониной)')).toBe(3500);
		expect(price('Соки')).toBe(1190);
		expect(price('Сметана')).toBe(180);
	});
});

describe('schema constraints', () => {
	it('requires a variant label in both languages or neither', () => {
		const db = migratedDb();
		expect(() =>
			db.prepare("INSERT INTO variants (item_id, label_kk, price) VALUES (1, '1 л', 100)").run()
		).toThrow(/CHECK/);
	});

	it('rejects negative prices', () => {
		const db = migratedDb();
		expect(() => db.prepare('INSERT INTO variants (item_id, price) VALUES (1, -5)').run()).toThrow(
			/CHECK/
		);
	});

	it('deletes variants together with their item', () => {
		const db = migratedDb();
		db.prepare('DELETE FROM items WHERE id = 23').run(); // Компот
		expect(db.prepare('SELECT count(*) AS n FROM variants WHERE item_id = 23').get()?.n).toBe(0);
	});

	it('keeps the cafe details in a single row, bilingual or empty', () => {
		const db = migratedDb();
		expect(db.prepare('SELECT count(*) AS n FROM cafe_info').get()?.n).toBe(0);
		db.prepare("INSERT INTO cafe_info (id, phone) VALUES (1, '+7 700 000 00 00')").run();
		expect(() => db.prepare('INSERT INTO cafe_info (id) VALUES (2)').run()).toThrow(/CHECK/);
		expect(() =>
			db.prepare("UPDATE cafe_info SET address_kk = 'Абай даңғылы, 1' WHERE id = 1").run()
		).toThrow(/CHECK/);
	});

	it('refuses to delete a category that still has items', () => {
		const db = migratedDb();
		expect(() => db.prepare('DELETE FROM categories WHERE id = 1').run()).toThrow(/FOREIGN KEY/);
	});
});
