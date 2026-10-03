import { describe, expect, it } from 'vitest';
import { groupMenu, type MenuRow } from './menu';

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
