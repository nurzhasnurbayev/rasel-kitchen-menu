<script lang="ts">
	import { ui, type Lang } from '$lib/i18n';
	import { photoUrl } from '$lib/photos';
	import Price from './Price.svelte';
	import type { MenuItem } from './types';

	let { item, lang }: { item: MenuItem; lang: Lang } = $props();

	const t = $derived(ui[lang]);
	// A single price sits on the name row; several (sizes, choices) are listed under the name.
	const single = $derived(item.variants.length === 1 ? item.variants[0] : null);
	// Sold-out dishes get no basket buttons.
	const orderable = $derived(item.available);
</script>

<li
	id="item-{item.id}"
	data-anchor="item-{item.id}"
	data-sold-out={item.available ? undefined : ''}
	class="group flex scroll-mt-[calc(var(--sticky-h)+0.5rem)] gap-3.5 px-4 py-3.5 data-sold-out:text-ink-muted"
>
	{#if item.photoKey}
		<img
			src={photoUrl(item.photoKey)}
			alt=""
			width="80"
			height="80"
			loading="lazy"
			decoding="async"
			class="size-20 shrink-0 rounded-xl bg-badge object-cover group-data-sold-out:opacity-60 group-data-sold-out:grayscale"
		/>
	{/if}

	<div class="min-w-0 flex-1">
		<div class="flex items-baseline justify-between gap-x-4">
			<h3 class="min-w-0 text-[1.0625rem] leading-snug font-semibold">
				{item.name}
				{#if !item.available}
					<span
						class="ml-1 inline-block rounded-full bg-badge px-2 py-px align-[0.1em] text-[0.8125rem] leading-normal font-semibold whitespace-nowrap text-ink-soft"
					>
						{t.soldOut}
					</span>
				{/if}
			</h3>
			{#if single}
				<div class="flex max-w-[60%] shrink-0 items-baseline gap-2.5">
					<p class="text-right">
						{#if single.label}
							<span class="whitespace-nowrap text-ink-muted">{single.label}</span>
							<span aria-hidden="true" class="text-ink-muted">·</span>
						{/if}
						<Price price={single.price} {lang} />
					</p>
					{#if orderable}
						<!-- basket-ui.ts puts the + button here. The negative margin keeps the 40px button
						     from making the card taller. -->
						<span data-basket-slot={single.id} class="-my-2 self-center empty:hidden"></span>
					{/if}
				</div>
			{/if}
		</div>

		{#if item.description}
			<p
				class="mt-1 text-[0.9375rem] leading-snug text-ink-soft group-data-sold-out:text-ink-muted"
			>
				{item.description}
			</p>
		{/if}

		{#if item.variants.length > 1}
			<ul class="mt-2 space-y-1">
				{#each item.variants as variant (variant.id)}
					<!-- Wraps on narrow screens, so an open − n + never covers the price. -->
					<li class="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1">
						<div class="flex min-w-[min(100%,9.5rem)] flex-1 items-baseline gap-2">
							<span class="whitespace-nowrap text-ink-soft group-data-sold-out:text-ink-muted"
								>{variant.label}</span
							>
							<span
								aria-hidden="true"
								class="min-w-3 flex-1 -translate-y-[0.3em] border-b-2 border-dotted border-line"
							></span>
							<span class="shrink-0"><Price price={variant.price} {lang} /></span>
						</div>
						{#if orderable}
							<span data-basket-slot={variant.id} class="empty:hidden"></span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</li>
