<script lang="ts">
	import { formatPrice } from '$lib/format';
	import { ui, type Lang } from '$lib/i18n';

	let { price, lang }: { price: number | null; lang: Lang } = $props();
</script>

{#if price === null}
	<span class="text-[0.9375rem] leading-snug text-ink-muted">{ui[lang].priceOnRequest}</span>
{:else}
	<span class="font-semibold whitespace-nowrap tabular-nums">{formatPrice(price)}</span>
{/if}
