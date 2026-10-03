<script lang="ts">
	import { ui, type Lang } from '$lib/i18n';
	import type { MenuCategory } from './types';

	let { categories, lang }: { categories: MenuCategory[]; lang: Lang } = $props();
</script>

<!--
	Sticky category tabs. Without JavaScript they are ordinary #anchor links; enhance.js adds smooth
	scrolling and marks the tab of the section on screen with aria-current="true".
-->
<nav
	aria-label={ui[lang].menuSections}
	data-category-nav
	class="sticky top-(--topbar-stick) z-20 border-b border-line bg-paper/95 backdrop-blur-md"
>
	<ul
		data-category-scroller
		class="relative mx-auto scrollbar-none flex h-(--tabs-h) max-w-2xl items-center gap-2 overflow-x-auto overscroll-x-contain px-4"
	>
		{#each categories as category (category.id)}
			<li class="shrink-0">
				<a
					href="#cat-{category.id}"
					data-category-tab="cat-{category.id}"
					class="flex h-10 items-center rounded-full border border-line bg-surface px-4 text-[0.9375rem] font-medium whitespace-nowrap text-ink-soft aria-[current=true]:border-accent aria-[current=true]:bg-accent aria-[current=true]:text-on-accent motion-safe:transition-colors"
				>
					{category.name}
				</a>
			</li>
		{/each}
	</ul>
</nav>
