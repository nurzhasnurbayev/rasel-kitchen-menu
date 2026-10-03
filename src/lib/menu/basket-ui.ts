/*
 * The guest basket on the menu page, as progressive enhancement. Bundled, minified and inlined
 * next to enhance.js (see enhance-script.ts), so it costs no extra request and ships no framework.
 *
 * The markup (bar, dialogs, templates for the buttons and rows) is rendered on the server by
 * Basket.svelte, hidden; the menu cards only mark where buttons go ([data-basket-slot]). This
 * script fills in the buttons, keeps everything in sync with the basket, and stores the basket in
 * localStorage. The basket logic itself is in $lib/basket/basket.ts.
 *
 * Imports must be relative: esbuild bundles this file without SvelteKit's aliases.
 */
import {
	BASKET_KEY,
	canAdd,
	indexMenu,
	parseBasket,
	quantityOf,
	reconcile,
	serializeBasket,
	setQuantity,
	viewBasket,
	MAX_QTY,
	type BasketLine,
	type BasketViewLine
} from '../basket/basket';
import { formatPrice } from '../format';
import type { BasketPageData } from './Basket.svelte';

(() => {
	const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
		root.querySelector<T>(selector);

	const dataTag = $('#basket-data');
	const basketDialog = $<HTMLDialogElement>('[data-basket-dialog]');
	const waiterDialog = $<HTMLDialogElement>('[data-waiter-dialog]');
	const bar = $('[data-basket-bar]');
	// Without <dialog> support the basket stays hidden and the menu works as a plain page.
	if (!dataTag || !basketDialog || !waiterDialog || !bar) return;
	if (typeof basketDialog.showModal !== 'function') return;

	let data: BasketPageData;
	try {
		data = JSON.parse(dataTag.textContent ?? '');
	} catch {
		return;
	}
	const { t } = data;
	const menu = indexMenu(data.items);

	// --- Storage (may be unavailable, e.g. blocked cookies: then the basket lasts one page view) ---

	let storage: Storage | null = null;
	try {
		storage = window.localStorage;
	} catch {
		/* keep the basket in memory only */
	}

	function readRaw(): string | null {
		try {
			return storage?.getItem(BASKET_KEY) ?? null;
		} catch {
			return null;
		}
	}

	function load(): BasketLine[] {
		// Drop dishes that left the menu since the basket was saved.
		return reconcile(parseBasket(readRaw(), Date.now()), menu);
	}

	function save() {
		try {
			if (lines.length) storage?.setItem(BASKET_KEY, serializeBasket(lines, Date.now()));
			else storage?.removeItem(BASKET_KEY);
		} catch {
			/* full or blocked: the basket still works on this page */
		}
	}

	let lines = load();
	// Dishes that left the menu were dropped: store the cleaned-up basket.
	if (lines.length !== parseBasket(readRaw(), Date.now()).length) save();

	// --- Rendering ---------------------------------------------------------------------------------

	const fullName = ({ name, label }: { name: string; label: string | null }) =>
		label ? `${name}, ${label}` : name;

	// One + / − n + control per orderable dish or size, cloned from the template into its slot.
	const controlTemplate = $<HTMLTemplateElement>('[data-basket-ctl-template]')!;
	const controls: HTMLElement[] = [];
	for (const slot of document.querySelectorAll<HTMLElement>('[data-basket-slot]')) {
		const variantId = Number(slot.dataset.basketSlot);
		const entry = menu.get(variantId);
		if (!entry || !canAdd(menu, variantId)) continue;
		const control = controlTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
		const name = fullName({ name: entry.item.name, label: entry.variant.label });
		const inc = $('[data-basket-inc]', control)!;
		const dec = $('[data-basket-dec]', control)!;
		control.dataset.basketCtl = String(variantId);
		inc.dataset.basketInc = dec.dataset.basketDec = String(variantId);
		inc.setAttribute('aria-label', `${t.addToBasket}: ${name}`);
		dec.setAttribute('aria-label', `${t.removeOne}: ${name}`);
		setText(control, '[data-qty-label]', `${t.inBasket}:`);
		controls.push(control);
		slot.append(control);
	}
	const lineList = $('[data-basket-lines]', basketDialog)!;
	const lineTemplate = $<HTMLTemplateElement>('[data-basket-line-template]')!;
	const waiterList = $('[data-waiter-lines]', waiterDialog)!;
	const waiterTemplate = $<HTMLTemplateElement>('[data-waiter-line-template]')!;

	const priceText = (price: number | null) =>
		price === null ? t.priceOnRequest : formatPrice(price);
	function setText(root: ParentNode, selector: string, text: string) {
		const element = $(selector, root);
		if (element) element.textContent = text;
	}

	/** A line's price, or the smaller "price on request" text; nothing for a sold-out dish. */
	function setLineTotal(row: HTMLElement, line: BasketViewLine) {
		const cell = $('[data-line-total]', row)!;
		cell.toggleAttribute('data-por', line.available && line.lineTotal === null);
		cell.textContent = line.available ? priceText(line.lineTotal) : '';
	}

	function totalText(total: number, hasPriceOnRequest: boolean) {
		if (total === 0 && hasPriceOnRequest) return t.priceOnRequest;
		return formatPrice(total) + (hasPriceOnRequest ? ' +' : '');
	}

	function render() {
		const view = viewBasket(lines, menu);

		for (const control of controls) {
			const variantId = Number(control.dataset.basketCtl);
			const qty = quantityOf(lines, variantId);
			control.toggleAttribute('data-in-basket', qty > 0);
			setText(control, '[data-qty-value]', String(qty));
			$<HTMLButtonElement>('[data-basket-inc]', control)!.disabled = qty >= MAX_QTY;
		}

		bar!.hidden = view.lines.length === 0;
		document.documentElement.toggleAttribute('data-basket', !bar!.hidden);
		setText(bar!, '[data-basket-count]', String(view.count));
		setText(
			bar!,
			'[data-basket-total]',
			view.count ? totalText(view.total, view.hasPriceOnRequest) : ''
		);

		renderBasketLines(view.lines);
		$('[data-basket-empty]', basketDialog!)!.hidden = view.lines.length > 0;
		setText(basketDialog!, '[data-basket-sum]', totalText(view.total, view.hasPriceOnRequest));
		$('[data-basket-por-note]', basketDialog!)!.hidden = !view.hasPriceOnRequest;
		$('[data-basket-soldout-note]', basketDialog!)!.hidden =
			view.orderable.length === view.lines.length;
		$<HTMLButtonElement>('[data-waiter-open]', basketDialog!)!.disabled =
			view.orderable.length === 0;
		$<HTMLButtonElement>('[data-basket-clear]', basketDialog!)!.disabled = view.lines.length === 0;

		waiterList.replaceChildren(
			...view.orderable.map((line) => {
				const row = waiterTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
				setText(row, '[data-line-qty]', `${line.qty} ×`);
				setText(row, '[data-line-name]', line.name);
				setText(row, '[data-line-label]', line.label ?? '');
				setLineTotal(row, line);
				return row;
			})
		);
		setText(waiterDialog!, '[data-waiter-sum]', totalText(view.total, view.hasPriceOnRequest));
		$('[data-waiter-por-note]', waiterDialog!)!.hidden = !view.hasPriceOnRequest;
		if (waiterDialog!.open && view.orderable.length === 0) waiterDialog!.close();
	}

	/** Basket rows are updated in place, so a focused +/− button keeps focus while tapping. */
	const rows = new Map<number, HTMLElement>();

	function renderBasketLines(viewLines: BasketViewLine[]) {
		const focused = document.activeElement;
		let lostFocus = false;
		const wanted = new Set(viewLines.map((line) => line.variantId));
		for (const [variantId, row] of rows) {
			if (wanted.has(variantId)) continue;
			if (row.contains(focused)) lostFocus = true;
			row.remove();
			rows.delete(variantId);
		}

		let previous: HTMLElement | null = null;
		for (const line of viewLines) {
			let row = rows.get(line.variantId);
			if (!row) {
				row = lineTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
				for (const button of row.querySelectorAll<HTMLElement>(
					'[data-basket-inc], [data-basket-dec]'
				)) {
					if ('basketInc' in button.dataset) button.dataset.basketInc = String(line.variantId);
					else button.dataset.basketDec = String(line.variantId);
				}
				rows.set(line.variantId, row);
			}
			// Keep DOM order equal to basket order without moving rows that are already in place.
			const expectedNext: ChildNode | null = previous ? previous.nextSibling : lineList.firstChild;
			if (expectedNext !== row) lineList.insertBefore(row, expectedNext);
			previous = row;

			row.toggleAttribute('data-sold-out', !line.available);
			setText(row, '[data-line-name]', line.name);
			setText(
				row,
				'[data-line-label]',
				[line.label, line.available ? '' : t.soldOut].filter(Boolean).join(' · ')
			);
			setText(
				row,
				'[data-line-unit]',
				line.qty > 1 && line.unitPrice !== null
					? `${line.label ? ' · ' : ''}${line.qty} × ${formatPrice(line.unitPrice)}`
					: ''
			);
			setText(row, '[data-line-qty]', String(line.qty));
			setLineTotal(row, line);
			const inc = $<HTMLButtonElement>('[data-basket-inc]', row)!;
			const dec = $<HTMLButtonElement>('[data-basket-dec]', row)!;
			inc.disabled = !line.available || line.qty >= MAX_QTY;
			inc.setAttribute('aria-label', `${t.addToBasket}: ${fullName(line)}`);
			dec.setAttribute('aria-label', `${t.removeOne}: ${fullName(line)}`);
		}

		// The row with the focused button is gone: keep keyboard and screen reader users in the list.
		if (lostFocus && basketDialog!.open) {
			(
				$<HTMLButtonElement>('[data-basket-dec]', lineList) ??
				$<HTMLButtonElement>('form button', basketDialog!)
			)?.focus();
		}
	}

	// --- Interaction -----------------------------------------------------------------------------

	function change(variantId: number, delta: number) {
		if (delta > 0 && !canAdd(menu, variantId)) return;
		lines = setQuantity(lines, variantId, quantityOf(lines, variantId) + delta);
		save();
		render();
	}

	document.addEventListener('click', (event) => {
		const button = event.target instanceof Element ? event.target.closest('button') : null;
		if (!button) return;
		const { basketInc, basketDec } = button.dataset;
		if (basketInc) change(Number(basketInc), 1);
		else if (basketDec) change(Number(basketDec), -1);
		else if ('basketOpen' in button.dataset) basketDialog!.showModal();
		else if ('basketClear' in button.dataset) {
			if (!confirm(t.confirmClear)) return;
			lines = [];
			save();
			render();
			basketDialog!.close();
		} else if ('waiterOpen' in button.dataset || 'waiterEdit' in button.dataset) {
			const toWaiter = 'waiterOpen' in button.dataset;
			(toWaiter ? basketDialog : waiterDialog)!.close();
			if (toWaiter) {
				const now = new Date();
				const pad = (n: number) => String(n).padStart(2, '0');
				setText(
					waiterDialog!,
					'[data-waiter-time]',
					`${pad(now.getHours())}:${pad(now.getMinutes())}`
				);
			}
			(toWaiter ? waiterDialog : basketDialog)!.showModal();
		}
	});

	// Tapping the dimmed backdrop closes the basket sheet.
	basketDialog.addEventListener('click', (event) => {
		if (event.target === basketDialog) basketDialog.close();
	});

	// Another tab (e.g. the other language) changed the basket, or the page came back from the
	// back/forward cache: read it again.
	window.addEventListener('storage', (event) => {
		if (event.key === BASKET_KEY || event.key === null) {
			lines = load();
			render();
		}
	});
	window.addEventListener('pageshow', (event) => {
		if (event.persisted) {
			lines = load();
			render();
		}
	});

	render();
})();
