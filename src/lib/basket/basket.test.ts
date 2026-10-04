import { describe, expect, it } from 'vitest';
import {
	BASKET_TTL_MS,
	canAdd,
	indexMenu,
	MAX_QTY,
	parseBasket,
	quantityOf,
	reconcile,
	serializeBasket,
	setQuantity,
	viewBasket,
	type BasketMenuItem
} from './basket';

const menu: BasketMenuItem[] = [
	{
		id: 1,
		name: 'Компот',
		available: true,
		variants: [
			{ id: 10, label: '1 л', price: 900 },
			{ id: 11, label: '0,5 л', price: 450 }
		]
	},
	{ id: 2, name: 'Кимчи', available: true, variants: [{ id: 20, label: null, price: null }] },
	{ id: 3, name: 'Борщ', available: false, variants: [{ id: 30, label: null, price: 1500 }] }
];
const index = indexMenu(menu);
const NOW = 1_800_000_000_000;

describe('storage', () => {
	it('round-trips lines in order', () => {
		const lines = [
			{ variantId: 11, qty: 2 },
			{ variantId: 10, qty: 1 }
		];
		expect(parseBasket(serializeBasket(lines, NOW), NOW + 1000)).toEqual(lines);
	});

	it('treats missing, malformed and foreign data as an empty basket', () => {
		expect(parseBasket(null, NOW)).toEqual([]);
		expect(parseBasket('{not json', NOW)).toEqual([]);
		expect(parseBasket('null', NOW)).toEqual([]);
		expect(parseBasket('{"v":2,"at":0,"lines":[]}', NOW)).toEqual([]);
		expect(parseBasket('[1,2]', NOW)).toEqual([]);
	});

	it('forgets a basket from an earlier visit', () => {
		const raw = serializeBasket([{ variantId: 10, qty: 1 }], NOW);
		expect(parseBasket(raw, NOW + BASKET_TTL_MS - 1)).toHaveLength(1);
		expect(parseBasket(raw, NOW + BASKET_TTL_MS + 1)).toEqual([]);
	});

	it('skips invalid lines and duplicates, and caps quantities', () => {
		const raw = JSON.stringify({
			v: 1,
			at: NOW,
			lines: [[10, 2], [10, 5], ['x', 1], [11, 0], [12, 1.5], [-1, 1], [20, 1000], 'junk']
		});
		expect(parseBasket(raw, NOW)).toEqual([
			{ variantId: 10, qty: 2 },
			{ variantId: 20, qty: MAX_QTY }
		]);
	});
});

describe('setQuantity', () => {
	it('adds new lines at the end, updates in place and removes at zero', () => {
		let lines = setQuantity([], 10, 1);
		lines = setQuantity(lines, 20, 1);
		lines = setQuantity(lines, 10, 3);
		expect(lines).toEqual([
			{ variantId: 10, qty: 3 },
			{ variantId: 20, qty: 1 }
		]);
		expect(quantityOf(lines, 10)).toBe(3);
		expect(setQuantity(lines, 10, 0)).toEqual([{ variantId: 20, qty: 1 }]);
		expect(quantityOf(setQuantity(lines, 10, 0), 10)).toBe(0);
	});

	it('clamps to 0…MAX_QTY', () => {
		expect(setQuantity([], 10, 500)).toEqual([{ variantId: 10, qty: MAX_QTY }]);
		expect(setQuantity([{ variantId: 10, qty: 1 }], 10, -3)).toEqual([]);
		expect(setQuantity([], 10, NaN)).toEqual([]);
	});
});

describe('against the menu', () => {
	it('only lets guests add dishes that are on the menu and not sold out', () => {
		expect(canAdd(index, 10)).toBe(true);
		expect(canAdd(index, 20)).toBe(true); // price on request is fine
		expect(canAdd(index, 30)).toBe(false); // sold out
		expect(canAdd(index, 99)).toBe(false); // not on the menu
	});

	it('drops lines whose dish or size is gone, keeping sold-out ones', () => {
		const lines = [
			{ variantId: 10, qty: 1 },
			{ variantId: 99, qty: 1 },
			{ variantId: 30, qty: 1 }
		];
		expect(reconcile(lines, index)).toEqual([
			{ variantId: 10, qty: 1 },
			{ variantId: 30, qty: 1 }
		]);
		const clean = [{ variantId: 10, qty: 1 }];
		expect(reconcile(clean, index)).toBe(clean);
	});

	it('totals priced, orderable lines and flags price on request', () => {
		const view = viewBasket(
			[
				{ variantId: 10, qty: 2 },
				{ variantId: 11, qty: 1 },
				{ variantId: 20, qty: 3 },
				{ variantId: 30, qty: 1 }
			],
			index
		);
		expect(view.total).toBe(2 * 900 + 450);
		expect(view.count).toBe(6);
		expect(view.hasPriceOnRequest).toBe(true);
		expect(view.lines.map((l) => [l.name, l.label, l.lineTotal, l.available])).toEqual([
			['Компот', '1 л', 1800, true],
			['Компот', '0,5 л', 450, true],
			['Кимчи', null, null, true],
			['Борщ', null, 1500, false]
		]);
		expect(view.orderable.map((l) => l.variantId)).toEqual([10, 11, 20]);
	});

	it('has an empty view for an empty basket', () => {
		expect(viewBasket([], index)).toEqual({
			lines: [],
			orderable: [],
			count: 0,
			total: 0,
			hasPriceOnRequest: false
		});
	});
});
