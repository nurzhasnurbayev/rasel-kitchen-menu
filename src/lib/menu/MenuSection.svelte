<script lang="ts">
	import type { Lang } from '$lib/i18n';
	import MenuItemCard from './MenuItemCard.svelte';
	import type { MenuCategory } from './types';

	let { category, lang }: { category: MenuCategory; lang: Lang } = $props();
</script>

<section
	id="cat-{category.id}"
	data-category-section
	aria-labelledby="cat-{category.id}-title"
	class="scroll-mt-[calc(var(--sticky-h)+0.5rem)]"
>
	<!-- tabindex="-1" so enhance.js can move focus here after a tab is tapped. -->
	<h2
		id="cat-{category.id}-title"
		data-anchor="cat-{category.id}"
		tabindex="-1"
		class="flex items-center gap-3 font-display text-[1.75rem] leading-tight font-bold"
	>
		<span>{category.name}</span>
		<span aria-hidden="true" class="h-px flex-1 translate-y-[0.15em] bg-line"></span>
	</h2>

	<ul
		class="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(42_28_19/0.05)]"
	>
		{#each category.items as item (item.id)}
			<MenuItemCard {item} {lang} />
		{/each}
	</ul>
</section>
