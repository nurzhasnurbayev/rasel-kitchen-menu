<!--
	Add / − n + for one dish or size: rendered once, inside a <template> in Basket.svelte.
	basket-ui.ts clones it into each [data-basket-slot] of the menu (filling in the variant id and
	the button labels), so the page does not carry 40 hidden copies, and without JavaScript nothing
	of it exists. data-in-basket is set while the variant is in the basket.
-->
<div
	data-basket-ctl
	class="group/ctl inline-flex shrink-0 items-center rounded-full border border-line bg-surface data-in-basket:border-accent data-in-basket:bg-accent data-in-basket:text-on-accent"
>
	<button
		type="button"
		data-basket-dec
		class="hidden size-10 place-items-center rounded-full text-xl leading-none group-data-in-basket/ctl:grid"
	>
		−
	</button>
	<span
		class="hidden min-w-5 text-center font-semibold tabular-nums group-data-in-basket/ctl:block"
	>
		<span data-qty-label class="sr-only"></span>
		<span data-qty-value>0</span>
	</span>
	<button
		type="button"
		data-basket-inc
		class="grid size-10 place-items-center rounded-full text-xl leading-none text-accent-ink group-data-in-basket/ctl:text-on-accent disabled:opacity-40"
	>
		+
	</button>
</div>
