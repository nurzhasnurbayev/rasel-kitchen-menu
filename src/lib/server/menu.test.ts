import { describe, expect, it } from 'vitest';
import { saveCafe } from './admin/repo';
import type { Database } from './db';
import { migratedDrizzle } from './db/test-db';
import { getMenuPage, groupMenu, type MenuRow } from './menu';

const row = (overrides: Partial<MenuRow>): MenuRow => ({
	categoryId: 1,
	categoryName: 'Сусындар',
	itemId: 1,
	itemName: 'Компот',
	description: null,
	photoKey: null,
	available: true,
	variantId: 1,
	label: null,
	price: 900,
	...overrides
});

describe('groupMenu', () => {
	it('folds rows into categories, items and variants in order', () => {
		const menu = groupMenu([
			row({ itemId: 1, variantId: 1, label: '1 л', price: 900 }),
			row({ itemId: 1, variantId: 2, label: '0,5 л', price: 450 }),
			row({ itemId: 2, itemName: 'Каркаде', variantId: 3, price: null }),
			row({
				categoryId: 2,
				categoryName: 'Соустар',
				itemId: 3,
				itemName: 'Кетчуп',
				variantId: 4,
				price: 180
			})
		]);

		expect(menu.map((c) => c.name)).toEqual(['Сусындар', 'Соустар']);
		expect(menu[0].items.map((i) => i.name)).toEqual(['Компот', 'Каркаде']);
		expect(menu[0].items[0].variants).toEqual([
			{ id: 1, label: '1 л', price: 900 },
			{ id: 2, label: '0,5 л', price: 450 }
		]);
		expect(menu[0].items[1].variants).toEqual([{ id: 3, label: null, price: null }]);
		expect(menu[1].items[0].variants).toEqual([{ id: 4, label: null, price: 180 }]);
	});

	it('keeps an item whose variants are missing (LEFT JOIN) without inventing a price', () => {
		const [category] = groupMenu([row({ variantId: null, label: null, price: null })]);
		expect(category.items[0].variants).toEqual([]);
	});

	it('normalises blank descriptions, labels and photo keys to null', () => {
		const [category] = groupMenu([row({ description: '  ', label: '', photoKey: '' })]);
		const item = category.items[0];
		expect(item.description).toBeNull();
		expect(item.photoKey).toBeNull();
		expect(item.variants[0].label).toBeNull();
	});

	it('returns an empty menu for no rows', () => {
		expect(groupMenu([])).toEqual([]);
	});
});

describe('getMenuPage', () => {
	const setup = () => migratedDrizzle().db as unknown as Database;

	it('loads the seeded menu in the requested language', async () => {
		const db = setup();
		const kk = await getMenuPage(db, 'kk');
		const ru = await getMenuPage(db, 'ru');

		expect(kk.menu.map((c) => c.name)).toEqual([
			'Бірінші тағамдар',
			'Екінші тағамдар',
			'Гарнирлер',
			'Сусындар',
			'Соустар',
			'Салаттар'
		]);
		expect(ru.menu[3].name).toBe('Напитки');
		expect(ru.menu[3].items[0]).toEqual({
			id: 23,
			name: 'Компот',
			description: null,
			photoKey: null,
			available: true,
			variants: [
				{ id: 31, label: '1 л', price: 900 },
				{ id: 32, label: '0,5 л', price: 450 }
			]
		});
		expect(kk.menu.flatMap((c) => c.items)).toHaveLength(37);
	});

	it('has no cafe details until the admin saves them', async () => {
		const { cafe } = await getMenuPage(setup(), 'kk');
		expect(cafe).toEqual({ address: null, hours: null, phone: null, twoGisUrl: null, notes: [] });
	});

	it('returns the cafe details in the requested language', async () => {
		const db = setup();
		await saveCafe(db, {
			addressKk: 'Алматы қ., Абай даңғылы, 1',
			addressRu: 'г. Алматы, пр. Абая, 1',
			hoursKk: 'Күн сайын 10:00–22:00',
			hoursRu: 'Ежедневно 10:00–22:00',
			phone: '+7 700 000 00 00',
			twoGisUrl: null,
			// Written straight to the database, blank lines would still be skipped.
			notesKk: 'Өз тамағыңызбен кіруге болмайды.\n\n Қызмет көрсету 10% ',
			notesRu: 'У нас со своей едой нельзя.\nОбслуживание 10%'
		});

		expect((await getMenuPage(db, 'kk')).cafe).toEqual({
			address: 'Алматы қ., Абай даңғылы, 1',
			hours: 'Күн сайын 10:00–22:00',
			phone: '+7 700 000 00 00',
			twoGisUrl: null,
			notes: ['Өз тамағыңызбен кіруге болмайды.', 'Қызмет көрсету 10%']
		});
		expect((await getMenuPage(db, 'ru')).cafe).toMatchObject({
			address: 'г. Алматы, пр. Абая, 1',
			hours: 'Ежедневно 10:00–22:00',
			notes: ['У нас со своей едой нельзя.', 'Обслуживание 10%']
		});
	});
});
