<script lang="ts">
	import { cafe } from '$lib/config';

	let { size = 36 }: { size?: number } = $props();
</script>

<!-- Decorative: the cafe name is always printed next to it. -->
{#if cafe.logo}
	<img
		src={cafe.logo}
		alt=""
		width={size}
		height={size}
		class="shrink-0 rounded-full object-cover"
	/>
{:else}
	<span
		aria-hidden="true"
		class="grid shrink-0 place-items-center rounded-full bg-accent pt-px font-display leading-none font-bold text-on-accent"
		style:width="{size}px"
		style:height="{size}px"
		style:font-size="{size * 0.56}px"
	>
		{cafe.name.charAt(0)}
	</span>
{/if}
