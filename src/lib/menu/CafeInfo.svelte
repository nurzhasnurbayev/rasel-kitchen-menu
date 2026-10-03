<script lang="ts">
	import { cafe, telHref } from '$lib/config';
	import { ui, type Lang } from '$lib/i18n';
	import Icon from './Icon.svelte';

	let { lang }: { lang: Lang } = $props();
	const t = $derived(ui[lang]);
</script>

<!-- Guests usually scan the QR at the table, so contacts stay compact and the menu starts early. -->
<div class="mx-auto max-w-2xl px-4 pt-6 pb-5">
	<h1 class="font-display text-[2.375rem] leading-none font-bold tracking-tight">{t.menu}</h1>

	<ul class="mt-3 text-ink-soft">
		<li class="flex min-h-9 items-start gap-2.5 py-1.5">
			<Icon name="pin" class="mt-[0.2em] size-[1.125rem] text-accent-ink" />
			<p>
				<span class="sr-only">{t.address}: </span>{cafe.address[lang]}
				<a
					href={cafe.twoGisUrl}
					target="_blank"
					rel="noopener"
					aria-label={t.openIn2gis}
					class="relative -top-px ml-1.5 inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 align-middle text-sm font-semibold whitespace-nowrap text-ink hover:border-ink-muted motion-safe:transition-colors"
				>
					2GIS<Icon name="external" class="size-3.5 text-ink-muted" />
				</a>
			</p>
		</li>
		<li class="flex min-h-9 items-start gap-2.5 py-1.5">
			<Icon name="clock" class="mt-[0.2em] size-[1.125rem] text-accent-ink" />
			<p><span class="sr-only">{t.hours}: </span>{cafe.hours[lang]}</p>
		</li>
		<li class="flex min-h-9 items-start gap-2.5 py-1.5">
			<Icon name="phone" class="mt-[0.2em] size-[1.125rem] text-accent-ink" />
			<a
				href={telHref(cafe.phone)}
				class="font-semibold text-accent-ink underline decoration-current/30 underline-offset-4 hover:decoration-current"
			>
				<span class="sr-only">{t.call}: </span>{cafe.phone}
			</a>
		</li>
	</ul>
</div>
