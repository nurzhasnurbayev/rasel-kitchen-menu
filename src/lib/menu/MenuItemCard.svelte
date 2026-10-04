<script lang="ts">
	import Logo from '$lib/brand/Logo.svelte';
	import { ui, type Lang } from '$lib/i18n';
	import { photoUrl } from '$lib/photos';
	import Price from './Price.svelte';
	import type { MenuItem } from './types';

	let { item, lang }: { item: MenuItem; lang: Lang } = $props();

	const t = $derived(ui[lang]);
	// Sold-out dishes get no basket buttons.
	const orderable = $derived(item.available);
</script>

<!--
	A dish card: the photo on top, then the name, the description and one row per price (a single
	price, or one row per size or choice). basket-ui.ts puts a + / − n + control in each
	[data-basket-slot].
-->
<li
	id="item-{item.id}"
	data-anchor="item-{item.id}"
	data-sold-out={item.available ? undefined : ''}
	class="group flex scroll-mt-[calc(var(--sticky-h)+0.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card data-sold-out:text-ink-muted"
>
	<!-- The photos are shot on white, so their frame stays white in dark mode too. -->
	<div class="relative aspect-square bg-white">
		{#if item.photoKey}
			<img
				src={photoUrl(item.photoKey)}
				alt=""
				width="400"
				height="400"
				loading="lazy"
				decoding="async"
				class="size-full object-cover group-data-sold-out:opacity-50 group-data-sold-out:grayscale"
			/>
		{:else}
			<!-- No photo yet: a faint monogram keeps the grid even. -->
			<div
				class="grid size-full place-items-center bg-badge text-line [--logo-accent:var(--color-line)]"
			>
				<Logo kind="mark" class="h-auto w-2/5" />
			</div>
		{/if}
		{#if !item.available}
			<span
				class="absolute top-2 left-2 rounded-full bg-ink/85 px-2.5 py-0.5 text-[0.8125rem] font-semibold text-paper"
			>
				{t.soldOut}
			</span>
		{/if}
	</div>

	<div class="flex flex-1 flex-col px-3 pt-2.5 pb-3">
		<h3 class="leading-snug font-semibold">{item.name}</h3>
		{#if item.description}
			<p class="mt-0.5 text-sm leading-snug text-ink-soft group-data-sold-out:text-ink-muted">
				{item.description}
			</p>
		{/if}

		<!-- Pushed to the bottom, so the prices of cards side by side line up. -->
		<ul class="mt-auto space-y-1 pt-2">
			{#each item.variants as variant (variant.id)}
				<!-- Wraps when the − n + control is open, so it never covers the price. -->
				<li class="flex min-h-10 flex-wrap items-center justify-between gap-x-2 gap-y-1">
					<p class="leading-tight">
						{#if variant.label}
							<span class="block text-sm text-ink-muted">{variant.label}</span>
						{/if}
						<Price price={variant.price} {lang} />
					</p>
					{#if orderable}
						<span data-basket-slot={variant.id} class="ml-auto empty:hidden"></span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</li>
