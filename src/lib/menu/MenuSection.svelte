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
		<!-- A short stroke in the logo orange, then a hairline to the edge. -->
		<span aria-hidden="true" class="flex flex-1 translate-y-[0.15em] items-center gap-1.5">
			<span class="h-[3px] w-5 rounded-full bg-orange"></span>
			<span class="h-px flex-1 bg-line"></span>
		</span>
	</h2>

	<!-- Two cards per row on phones, three on wider screens. -->
	<ul class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
		{#each category.items as item (item.id)}
			<MenuItemCard {item} {lang} />
		{/each}
	</ul>
</section>
