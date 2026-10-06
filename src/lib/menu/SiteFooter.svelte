<script lang="ts">
	import Logo from '$lib/brand/Logo.svelte';
	import { cafe, telHref } from '$lib/config';
	import { LANGS, ui, type Lang } from '$lib/i18n';
	import type { CafeInfo } from './types';

	let { lang, details }: { lang: Lang; details: CafeInfo } = $props();
	const other = $derived(LANGS.find((l) => l !== lang) ?? lang);
</script>

<footer class="mx-auto max-w-2xl px-4 pt-14 pb-16 text-center text-[0.9375rem] text-ink-soft">
	<div aria-hidden="true" class="mx-auto mb-7 h-px w-16 bg-line"></div>
	<Logo kind="wordmark" label={cafe.name} class="mx-auto h-20 w-auto text-logo" />
	{#if details.address}<p class="mt-4">{details.address}</p>{/if}
	{#if details.hours}<p class={details.address ? '' : 'mt-4'}>{details.hours}</p>{/if}
	{#if details.phone || details.twoGisUrl}
		<p class="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 font-semibold">
			{#if details.phone}
				<a href={telHref(details.phone)} class="text-accent-ink underline-offset-4 hover:underline">
					{details.phone}
				</a>
			{/if}
			{#if details.twoGisUrl}
				<a
					href={details.twoGisUrl}
					target="_blank"
					rel="noopener"
					class="text-accent-ink underline-offset-4 hover:underline">2GIS</a
				>
			{/if}
		</p>
	{/if}
	{#if details.notes.length > 0}
		<ul class="mt-4 space-y-0.5">
			{#each details.notes as note, i (i)}<li>{note}</li>{/each}
		</ul>
	{/if}
	<p class="mt-6">
		<a
			href="/{other}"
			hreflang={other}
			lang={other}
			data-lang-switch={other}
			class="underline decoration-line underline-offset-4 hover:decoration-current"
		>
			{ui[other].langName}
		</a>
	</p>
</footer>
