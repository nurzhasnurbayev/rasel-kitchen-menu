<script lang="ts">
	import { cafe, telHref } from '$lib/config';
	import { LANGS, ui, type Lang } from '$lib/i18n';

	let { lang }: { lang: Lang } = $props();
	const other = $derived(LANGS.find((l) => l !== lang) ?? lang);
</script>

<footer class="mx-auto max-w-2xl px-4 pt-14 pb-16 text-center text-[0.9375rem] text-ink-soft">
	<div aria-hidden="true" class="mx-auto mb-7 h-px w-16 bg-line"></div>
	<p class="font-display text-2xl font-bold text-ink">{cafe.name}</p>
	<p class="mt-2">{cafe.address[lang]}</p>
	<p>{cafe.hours[lang]}</p>
	<p class="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 font-semibold">
		<a href={telHref(cafe.phone)} class="text-accent-ink underline-offset-4 hover:underline">
			{cafe.phone}
		</a>
		<a
			href={cafe.twoGisUrl}
			target="_blank"
			rel="noopener"
			class="text-accent-ink underline-offset-4 hover:underline">2GIS</a
		>
	</p>
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
