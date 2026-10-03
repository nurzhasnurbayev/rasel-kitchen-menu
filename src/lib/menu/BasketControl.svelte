<script lang="ts">
	import { ui, type Lang } from '$lib/i18n';

	let {
		variantId,
		name,
		lang,
		class: className = ''
	}: { variantId: number; name: string; lang: Lang; class?: string } = $props();
	const t = $derived(ui[lang]);
</script>

<!--
	Add / − n + for one dish or size. Hidden in the HTML: basket-ui.ts reveals it once the basket
	works, and sets data-in-basket while the variant is in the basket. Without JavaScript the menu
	reads exactly as before.
-->
<div
	data-basket-ctl={variantId}
	hidden
	class={[
		'group/ctl inline-flex shrink-0 items-center rounded-full border border-line bg-surface data-in-basket:border-accent data-in-basket:bg-accent data-in-basket:text-on-accent',
		className
	]}
>
	<button
		type="button"
		data-basket-dec={variantId}
		aria-label="{t.removeOne}: {name}"
		class="hidden size-10 place-items-center rounded-full text-xl leading-none group-data-in-basket/ctl:grid"
	>
		−
	</button>
	<span
		data-basket-qty={variantId}
		class="hidden min-w-5 text-center font-semibold tabular-nums group-data-in-basket/ctl:block"
	>
		<span class="sr-only">{t.inBasket}:</span>
		<span data-qty-value>0</span>
	</span>
	<button
		type="button"
		data-basket-inc={variantId}
		aria-label="{t.addToBasket}: {name}"
		class="grid size-10 place-items-center rounded-full text-xl leading-none text-accent-ink group-data-in-basket/ctl:text-on-accent disabled:opacity-40"
	>
		+
	</button>
</div>
