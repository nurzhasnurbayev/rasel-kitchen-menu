/**
 * The guest basket: which dishes (variants) a guest has picked, and how many.
 *
 * Only variant ids and quantities are stored on the device. Names, sizes, prices and availability
 * always come from the menu page the guest is looking at, so a basket started in Kazakh reads in
 * Russian after a language switch, and a price changed in the admin panel is never shown stale.
 *
 * Pure functions, shared by the inline script on the menu page (basket-ui.ts) and the tests.
 */

/** localStorage key. */
export const BASKET_KEY = 'rasel-basket';
/** A basket untouched for this long is from an earlier visit and starts over empty. */
export const BASKET_TTL_MS = 6 * 60 * 60 * 1000;
/** Highest quantity of one line. */
export const MAX_QTY = 99;

export interface BasketLine {
	variantId: number;
	qty: number;
}

/** The menu as the basket sees it: embedded in the menu page as JSON (see Basket.svelte). */
export interface BasketMenuItem {
	id: number;
	name: string;
	available: boolean;
	variants: { id: number; label: string | null; price: number | null }[];
}

interface StoredBasket {
	v: 1;
	/** Time of the last change, ms since the epoch. */
	at: number;
	/** [variantId, qty] pairs in the order they were first added. */
	lines: [number, number][];
}

/** Reads a stored basket. Anything malformed, from an unknown version, or expired is empty. */
export function parseBasket(raw: string | null, now: number): BasketLine[] {
	if (!raw) return [];
	let data: Partial<StoredBasket>;
	try {
		data = JSON.parse(raw);
	} catch {
		return [];
	}
	if (!data || data.v !== 1 || !Array.isArray(data.lines) || typeof data.at !== 'number') return [];
	if (now - data.at > BASKET_TTL_MS || data.at > now + 60_000) return [];

	const lines: BasketLine[] = [];
	for (const entry of data.lines) {
		if (!Array.isArray(entry)) continue;
		const [variantId, qty] = entry;
		if (!isId(variantId) || !Number.isInteger(qty) || qty < 1) continue;
		if (lines.some((line) => line.variantId === variantId)) continue;
		lines.push({ variantId, qty: Math.min(qty, MAX_QTY) });
	}
	return lines;
}

export function serializeBasket(lines: BasketLine[], now: number): string {
	const stored: StoredBasket = { v: 1, at: now, lines: lines.map((l) => [l.variantId, l.qty]) };
	return JSON.stringify(stored);
}

export function quantityOf(lines: BasketLine[], variantId: number): number {
	return lines.find((line) => line.variantId === variantId)?.qty ?? 0;
}

/** Sets a line's quantity (0 removes it; new lines go last). Returns a new array. */
export function setQuantity(lines: BasketLine[], variantId: number, qty: number): BasketLine[] {
	const clamped = Math.max(0, Math.min(MAX_QTY, Math.trunc(qty) || 0));
	const rest = lines.filter((line) => line.variantId !== variantId);
	if (clamped === 0) return rest;
	if (rest.length === lines.length) return [...lines, { variantId, qty: clamped }];
	return lines.map((line) => (line.variantId === variantId ? { variantId, qty: clamped } : line));
}

export interface MenuEntry {
	item: BasketMenuItem;
	variant: BasketMenuItem['variants'][number];
}

/** variant id → its item and variant. */
export function indexMenu(items: BasketMenuItem[]): Map<number, MenuEntry> {
	const index = new Map<number, MenuEntry>();
	for (const item of items) {
		for (const variant of item.variants) index.set(variant.id, { item, variant });
	}
	return index;
}

/** Whether a guest may add (more of) this variant: it is on the menu and not sold out. */
export function canAdd(index: Map<number, MenuEntry>, variantId: number): boolean {
	return index.get(variantId)?.item.available === true;
}

/**
 * Drops lines that are no longer on the menu (dish or size deleted, category hidden).
 * Sold-out dishes stay, so the guest sees why they are left out of the total.
 */
export function reconcile(lines: BasketLine[], index: Map<number, MenuEntry>): BasketLine[] {
	const kept = lines.filter((line) => index.has(line.variantId));
	return kept.length === lines.length ? lines : kept;
}

export interface BasketViewLine {
	variantId: number;
	qty: number;
	name: string;
	/** Size or choice, e.g. "0,5 л"; null for a dish with a single price. */
	label: string | null;
	/** Null means "price on request". */
	unitPrice: number | null;
	lineTotal: number | null;
	available: boolean;
}

export interface BasketView {
	lines: BasketViewLine[];
	/** Lines that can be ordered (not sold out), in basket order. */
	orderable: BasketViewLine[];
	/** Number of portions that can be ordered. */
	count: number;
	/** Sum of the orderable lines with a price. */
	total: number;
	/** Some orderable line has no price, so the real total will be higher. */
	hasPriceOnRequest: boolean;
}

export function viewBasket(lines: BasketLine[], index: Map<number, MenuEntry>): BasketView {
	const viewLines: BasketViewLine[] = [];
	for (const line of lines) {
		const entry = index.get(line.variantId);
		if (!entry) continue;
		const unitPrice = entry.variant.price;
		viewLines.push({
			variantId: line.variantId,
			qty: line.qty,
			name: entry.item.name,
			// A lone variant's label (e.g. "300 г") still helps the waiter, so it is kept.
			label: entry.variant.label,
			unitPrice,
			lineTotal: unitPrice === null ? null : unitPrice * line.qty,
			available: entry.item.available
		});
	}
	const orderable = viewLines.filter((line) => line.available);
	return {
		lines: viewLines,
		orderable,
		count: orderable.reduce((sum, line) => sum + line.qty, 0),
		total: orderable.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0),
		hasPriceOnRequest: orderable.some((line) => line.unitPrice === null)
	};
}

function isId(value: unknown): value is number {
	return Number.isInteger(value) && (value as number) > 0;
}
