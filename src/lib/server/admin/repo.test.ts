import { describe, expect, it } from 'vitest';
import { migratedDrizzle } from '../db/test-db';
import type { CafeInput, ItemInput } from './forms';
import {
	createCategory,
	createItem,
	deleteCategory,
	deleteItem,
	getAdminMenu,
	getCafe,
	getItem,
	moveCategory,
	moveInList,
	moveItem,
	saveCafe,
	setItemAvailable,
	setItemPhoto,
	updateCategory,
	updateItem,
	type AdminDb
} from './repo';

function setup() {
	const { db, sqlite } = migratedDrizzle();
	return { db: db as unknown as AdminDb, sqlite };
}

/** Компот (id 23, category 4 "Сусындар") with its two sizes, as the form would submit it. */
const kompot = (overrides: Partial<ItemInput> = {}): ItemInput => ({
	categoryId: 4,
	nameKk: 'Компот',
	nameRu: 'Компот',
	descriptionKk: null,
	descriptionRu: null,
	available: true,
	variants: [
		{ id: 31, labelKk: '1 л', labelRu: '1 л', price: 900 },
		{ id: 32, labelKk: '0,5 л', labelRu: '0,5 л', price: 450 }
	],
	...overrides
});

describe('reading', () => {
	it('loads every category, item and variant in menu order', async () => {
		const { db } = setup();
		const menu = await getAdminMenu(db);
		expect(menu.map((c) => c.nameRu)).toEqual([
			'Первые блюда',
			'Вторые блюда',
			'Гарниры',
			'Напитки',
			'Соусы',
			'Салаты'
		]);
		expect(menu.flatMap((c) => c.items)).toHaveLength(37);
		expect(menu.flatMap((c) => c.items.flatMap((i) => i.variants))).toHaveLength(40);
		const drinks = menu[3].items;
		expect(drinks[0]).toMatchObject({ id: 23, nameRu: 'Компот' });
		expect(drinks[0].variants.map((v) => v.labelRu)).toEqual(['1 л', '0,5 л']);
	});

	it('loads one item with its variants', async () => {
		const { db } = setup();
		expect(await getItem(db, 23)).toMatchObject({
			nameRu: 'Компот',
			variants: [{ id: 31 }, { id: 32 }]
		});
		expect(await getItem(db, 999)).toBeNull();
	});
});

describe('categories', () => {
	it('adds a category at the end, edits and deletes it', async () => {
		const { db } = setup();
		const id = await createCategory(db, { nameKk: 'Тәттілер', nameRu: 'Десерты', visible: false });
		let menu = await getAdminMenu(db);
		expect(menu.at(-1)).toMatchObject({ id, nameRu: 'Десерты', visible: false, sortOrder: 7 });

		expect(
			await updateCategory(db, id, { nameKk: 'Десерттер', nameRu: 'Десерты', visible: true })
		).toBe(true);
		menu = await getAdminMenu(db);
		expect(menu.at(-1)).toMatchObject({ nameKk: 'Десерттер', visible: true });

		expect(await deleteCategory(db, id)).toBe('deleted');
		expect(await deleteCategory(db, id)).toBe('not-found');
		expect(await updateCategory(db, id, { nameKk: 'x', nameRu: 'x', visible: true })).toBe(false);
	});

	it('refuses to delete a category that has dishes', async () => {
		const { db } = setup();
		expect(await deleteCategory(db, 1)).toBe('not-empty');
		expect((await getAdminMenu(db))[0].items).toHaveLength(7);
	});

	it('moves categories up and down, renumbering sort_order', async () => {
		const { db, sqlite } = setup();
		expect(await moveCategory(db, 4, -1)).toBe(true);
		expect((await getAdminMenu(db)).map((c) => c.id)).toEqual([1, 2, 4, 3, 5, 6]);
		expect(await moveCategory(db, 1, -1)).toBe(false);
		expect(await moveCategory(db, 6, 1)).toBe(false);
		expect(await moveCategory(db, 99, 1)).toBe(false);
		const orders = sqlite.prepare('SELECT sort_order FROM categories ORDER BY sort_order').all();
		expect(orders.map((r) => r.sort_order)).toEqual([1, 2, 3, 4, 5, 6]);
	});
});

describe('moveInList', () => {
	it('swaps with the neighbour', () => {
		expect(moveInList([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
		expect(moveInList([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
		expect(moveInList([1, 2, 3], 1, -1)).toBeNull();
		expect(moveInList([1, 2, 3], 3, 1)).toBeNull();
		expect(moveInList([1, 2, 3], 4, 1)).toBeNull();
	});
});

describe('items', () => {
	it('creates an item with its variants, last in its category', async () => {
		const { db } = setup();
		const id = await createItem(
			db,
			kompot({
				nameKk: 'Морс',
				nameRu: 'Морс',
				variants: [
					{ id: null, labelKk: '1 л', labelRu: '1 л', price: 1000 },
					{ id: 31, labelKk: '0,5 л', labelRu: '0,5 л', price: null } // ids are ignored on create
				]
			})
		);
		const item = await getItem(db, id);
		expect(item).toMatchObject({ id, categoryId: 4, nameRu: 'Морс', sortOrder: 9 });
		expect(item!.variants.map((v) => [v.itemId, v.labelRu, v.price, v.sortOrder])).toEqual([
			[id, '1 л', 1000, 1],
			[id, '0,5 л', null, 2]
		]);
		// Компот keeps its own variants.
		expect((await getItem(db, 23))!.variants).toHaveLength(2);
	});

	it('updates an item, keeping variant ids, deleting removed ones and adding new ones', async () => {
		const { db } = setup();
		const saved = await updateItem(
			db,
			23,
			kompot({
				nameRu: 'Компот домашний',
				descriptionRu: 'Из сухофруктов',
				available: false,
				variants: [
					{ id: 32, labelKk: '0,5 л', labelRu: '0,5 л', price: 500 }, // moved first, new price
					{ id: null, labelKk: '2 л', labelRu: '2 л', price: 1700 }
				]
			})
		);
		expect(saved).toBe(true);
		const item = await getItem(db, 23);
		expect(item).toMatchObject({
			nameRu: 'Компот домашний',
			descriptionRu: 'Из сухофруктов',
			available: false
		});
		expect(item!.variants.map((v) => [v.id === 32, v.labelRu, v.price, v.sortOrder])).toEqual([
			[true, '0,5 л', 500, 1],
			[false, '2 л', 1700, 2]
		]);
	});

	it('never takes over a variant of another item', async () => {
		const { db } = setup();
		// 33 is a variant of Каркаде: for Компот it is just a new size.
		await updateItem(
			db,
			23,
			kompot({ variants: [{ id: 33, labelKk: 'x', labelRu: 'x', price: 1 }] })
		);
		expect((await getItem(db, 23))!.variants.map((v) => [v.id === 33, v.labelRu])).toEqual([
			[false, 'x']
		]);
		expect((await getItem(db, 24))!.variants.map((v) => v.id)).toContain(33);
	});

	it('puts an item moved to another category at its end', async () => {
		const { db } = setup();
		await updateItem(db, 23, kompot({ categoryId: 6 }));
		expect(await getItem(db, 23)).toMatchObject({ categoryId: 6, sortOrder: 5 });
	});

	it('saves all or nothing', async () => {
		const { db } = setup();
		// The second variant breaks a CHECK constraint (label in one language only), so the
		// already-executed name change and variant delete must be rolled back too.
		const broken = kompot({
			nameRu: 'Не сохранится',
			variants: [
				{ id: 31, labelKk: '1 л', labelRu: '1 л', price: 900 },
				{ id: null, labelKk: 'x', labelRu: null, price: 1 }
			]
		});
		await expect(updateItem(db, 23, broken)).rejects.toThrow(/CHECK/);
		const item = await getItem(db, 23);
		expect(item!.nameRu).toBe('Компот');
		expect(item!.variants.map((v) => v.id)).toEqual([31, 32]);

		await expect(createItem(db, { ...broken, nameRu: 'Новое' })).rejects.toThrow(/CHECK/);
		const names = (await getAdminMenu(db)).flatMap((c) => c.items.map((i) => i.nameRu));
		expect(names).not.toContain('Новое');
		expect(names).toHaveLength(37);
	});

	it('reports a missing item', async () => {
		const { db } = setup();
		expect(await updateItem(db, 999, kompot())).toBe(false);
		expect(await setItemAvailable(db, 999, false)).toBe(false);
		expect(await deleteItem(db, 999)).toBeUndefined();
		expect(await setItemPhoto(db, 999, 'items/999/a.webp')).toBeUndefined();
	});

	it('toggles availability', async () => {
		const { db } = setup();
		expect(await setItemAvailable(db, 2, false)).toBe(true);
		expect((await getItem(db, 2))!.available).toBe(false);
	});

	it('moves items within their category only', async () => {
		const { db } = setup();
		expect(await moveItem(db, 24, -1)).toBe(true);
		const drinks = (await getAdminMenu(db))[3].items.map((i) => i.id);
		expect(drinks.slice(0, 2)).toEqual([24, 23]);
		expect(await moveItem(db, 24, -1)).toBe(false); // already first in Напитки
		expect(await moveItem(db, 999, 1)).toBe(false);
	});

	it('swaps photos and returns the replaced key', async () => {
		const { db } = setup();
		expect(await setItemPhoto(db, 2, 'items/2/a.webp')).toEqual({ oldKey: null });
		expect(await setItemPhoto(db, 2, 'items/2/b.webp')).toEqual({ oldKey: 'items/2/a.webp' });
		expect(await setItemPhoto(db, 2, null)).toEqual({ oldKey: 'items/2/b.webp' });
	});

	it('deletes an item with its variants and returns its photo key', async () => {
		const { db, sqlite } = setup();
		await setItemPhoto(db, 23, 'items/23/a.webp');
		expect(await deleteItem(db, 23)).toEqual({ photoKey: 'items/23/a.webp' });
		expect(sqlite.prepare('SELECT count(*) AS n FROM variants WHERE item_id = 23').get()?.n).toBe(
			0
		);
	});
});

describe('cafe details', () => {
	const details: CafeInput = {
		addressKk: 'Алматы қ., Абай даңғылы, 1',
		addressRu: 'г. Алматы, пр. Абая, 1',
		hoursKk: 'Күн сайын 10:00–22:00',
		hoursRu: 'Ежедневно 10:00–22:00',
		phone: '+7 700 000 00 00',
		twoGisUrl: 'https://go.2gis.com/abcde',
		notesKk: 'Қызмет көрсету 10%',
		notesRu: 'Обслуживание 10%'
	};

	it('reads as empty until something is saved', async () => {
		const { db } = setup();
		expect(await getCafe(db)).toEqual({
			addressKk: null,
			addressRu: null,
			hoursKk: null,
			hoursRu: null,
			phone: null,
			twoGisUrl: null,
			notesKk: null,
			notesRu: null
		});
	});

	it('creates the single row on the first save and updates it afterwards', async () => {
		const { db, sqlite } = setup();
		await saveCafe(db, details);
		expect(await getCafe(db)).toEqual(details);

		await saveCafe(db, {
			...details,
			phone: null,
			hoursRu: 'Круглосуточно',
			hoursKk: 'Тәулік бойы'
		});
		expect(await getCafe(db)).toEqual({
			...details,
			phone: null,
			hoursRu: 'Круглосуточно',
			hoursKk: 'Тәулік бойы'
		});
		expect(sqlite.prepare('SELECT count(*) AS n FROM cafe_info').get()?.n).toBe(1);
	});
});
