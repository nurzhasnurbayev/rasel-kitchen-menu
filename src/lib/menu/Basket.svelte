<script lang="ts" module>
	import type { BasketMenuItem } from '$lib/basket/basket';
	import type { Dictionary } from '$lib/i18n';

	/** What basket-ui.ts reads from the page: the orderable menu plus the strings it builds text from. */
	export interface BasketPageData {
		items: BasketMenuItem[];
		t: Pick<
			Dictionary,
			'priceOnRequest' | 'soldOut' | 'addToBasket' | 'removeOne' | 'inBasket' | 'confirmClear'
		>;
	}
</script>

<script lang="ts">
	import { cafe } from '$lib/config';
	import { ui, type Lang } from '$lib/i18n';
	import BasketControl from './BasketControl.svelte';
	import type { MenuCategory } from './types';

	let { menu, lang }: { menu: MenuCategory[]; lang: Lang } = $props();
	const t = $derived(ui[lang]);

	const data = $derived<BasketPageData>({
		items: menu.flatMap((category) =>
			category.items.map(({ id, name, available, variants }) => ({ id, name, available, variants }))
		),
		t: {
			priceOnRequest: t.priceOnRequest,
			soldOut: t.soldOut,
			addToBasket: t.addToBasket,
			removeOne: t.removeOne,
			inBasket: t.inBasket,
			confirmClear: t.confirmClear
		}
	});
	// `<` is escaped so no dish name can close the script element.
	const dataTag = $derived(
		`<script type="application/json" id="basket-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</` +
			'script>'
	);

	const button =
		'inline-flex min-h-12 items-center justify-center rounded-full px-5 font-semibold disabled:opacity-40';
</script>

<!--
	The guest basket. Everything here is inert HTML until basket-ui.ts (inlined with enhance.js)
	starts: the bar stays hidden and the dialogs closed, so the page reads the same without JavaScript.
-->
{@html dataTag}

<div
	data-basket-bar
	hidden
	class="fixed inset-x-0 bottom-0 z-40 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
>
	<button
		type="button"
		data-basket-open
		aria-haspopup="dialog"
		class="mx-auto flex min-h-14 w-full max-w-2xl items-center gap-3 rounded-full bg-accent px-5 text-left text-on-accent shadow-float"
	>
		<span class="font-semibold">{t.basket}</span>
		<span
			data-basket-count
			class="grid h-7 min-w-7 place-items-center rounded-full bg-orange px-2 text-sm font-bold text-on-orange tabular-nums"
		></span>
		<span data-basket-total class="ml-auto font-semibold whitespace-nowrap tabular-nums"></span>
	</button>
</div>

<dialog
	data-basket-dialog
	aria-labelledby="basket-title"
	class="mx-0 mt-auto mb-0 max-h-[88dvh] w-full max-w-none flex-col rounded-t-3xl bg-paper text-ink backdrop:bg-black/45 open:flex sm:m-auto sm:max-w-lg sm:rounded-3xl"
>
	<header class="flex items-center gap-3 border-b border-line px-5 py-3">
		<h2 id="basket-title" class="font-display text-2xl font-bold">{t.basket}</h2>
		<form method="dialog" class="ml-auto">
			<button
				class="-mr-2 grid size-11 place-items-center rounded-full text-2xl leading-none text-ink-soft"
				aria-label={t.close}>×</button
			>
		</form>
	</header>

	<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
		<p data-basket-empty class="py-10 text-center text-ink-soft">{t.basketEmpty}</p>
		<ul data-basket-lines class="divide-y divide-line"></ul>
	</div>

	<footer class="border-t border-line px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
		<p class="flex items-baseline justify-between text-lg font-semibold">
			<span>{t.total}</span>
			<span data-basket-sum class="tabular-nums"></span>
		</p>
		<p data-basket-por-note hidden class="mt-0.5 text-sm text-ink-soft">{t.priceOnRequestNote}</p>
		<p data-basket-soldout-note hidden class="mt-0.5 text-sm text-ink-soft">{t.soldOutNote}</p>
		<div class="mt-3 flex flex-col gap-2">
			<button type="button" data-waiter-open class="{button} bg-accent text-on-accent">
				{t.showToWaiter}
			</button>
			<button type="button" data-basket-clear class="{button} text-ink-soft underline-offset-4">
				{t.clearBasket}
			</button>
		</div>
	</footer>
</dialog>

<!-- Full screen, always light and in large print, so the waiter can read it or take a photo. -->
<dialog
	data-waiter-dialog
	aria-labelledby="waiter-title"
	class="m-0 h-dvh max-h-none w-full max-w-none flex-col bg-white text-neutral-950 [color-scheme:light] open:flex"
>
	<div class="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-5 pt-5">
		<p class="text-base text-neutral-600">{t.showThisScreen}</p>
		<div class="mt-1 flex items-baseline justify-between gap-4 border-b-2 border-neutral-950 pb-3">
			<h2 id="waiter-title" class="font-display text-4xl font-bold">{t.order}</h2>
			<p class="text-lg text-neutral-600 tabular-nums">
				{cafe.name} · <time data-waiter-time></time>
			</p>
		</div>
		<ul
			data-waiter-lines
			class="min-h-0 flex-1 divide-y divide-neutral-300 overflow-y-auto text-[1.625rem] leading-tight"
		></ul>
		<div class="border-t-2 border-neutral-950 py-4">
			<p class="flex items-baseline justify-between gap-4 text-[2rem] font-bold">
				<span>{t.total}</span>
				<span data-waiter-sum class="tabular-nums"></span>
			</p>
			<p data-waiter-por-note hidden class="text-lg text-neutral-600">{t.priceOnRequestNote}</p>
		</div>
	</div>
	<div class="mx-auto flex w-full max-w-2xl gap-3 px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
		<button
			type="button"
			data-waiter-edit
			class="{button} flex-1 border-2 border-neutral-950 text-neutral-950"
		>
			{t.editOrder}
		</button>
		<form method="dialog" class="flex flex-1">
			<button class="{button} flex-1 bg-neutral-950 text-white">{t.close}</button>
		</form>
	</div>
</dialog>

<template data-basket-ctl-template><BasketControl /></template>

<template data-basket-line-template>
	<li class="flex items-center gap-3 py-3 data-sold-out:text-ink-muted">
		<div class="min-w-0 flex-1">
			<p data-line-name class="leading-snug font-semibold"></p>
			<p class="text-[0.9375rem] text-ink-soft">
				<span data-line-label></span>
				<span data-line-unit class="tabular-nums"></span>
			</p>
		</div>
		<div
			class="inline-flex shrink-0 items-center rounded-full border border-line bg-surface"
			data-line-stepper
		>
			<button
				type="button"
				data-basket-dec
				class="grid size-10 place-items-center rounded-full text-xl leading-none">−</button
			>
			<span data-line-qty class="min-w-6 text-center font-semibold tabular-nums"></span>
			<button
				type="button"
				data-basket-inc
				class="grid size-10 place-items-center rounded-full text-xl leading-none disabled:opacity-30"
				>+</button
			>
		</div>
		<p
			data-line-total
			class="w-24 shrink-0 text-right font-semibold tabular-nums data-por:text-sm data-por:leading-snug data-por:font-normal data-por:text-ink-soft"
		></p>
	</li>
</template>

<template data-waiter-line-template>
	<li class="flex items-baseline gap-4 py-3">
		<span data-line-qty class="w-14 shrink-0 font-bold tabular-nums"></span>
		<span class="min-w-0 flex-1">
			<span data-line-name class="font-semibold"></span>
			<span data-line-label class="block text-[1.25rem] text-neutral-600"></span>
		</span>
		<span
			data-line-total
			class="max-w-[40%] shrink-0 text-right tabular-nums data-por:text-xl data-por:leading-snug data-por:text-neutral-600"
		></span>
	</li>
</template>
