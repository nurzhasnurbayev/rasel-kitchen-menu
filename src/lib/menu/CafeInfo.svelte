<script lang="ts">
	import Logo from '$lib/brand/Logo.svelte';
	import { cafe, telHref } from '$lib/config';
	import { ui, type Lang } from '$lib/i18n';
	import Icon from './Icon.svelte';
	import type { CafeInfo } from './types';

	let { lang, details }: { lang: Lang; details: CafeInfo } = $props();
	const t = $derived(ui[lang]);
	const hasDetails = $derived(
		!!(details.address || details.hours || details.phone || details.twoGisUrl)
	);
</script>

<!-- The logo on its violet, like the cover of a printed menu. It continues the top bar. -->
<div class={['rounded-b-[1.75rem] bg-brand text-on-brand', hasDetails ? 'pb-13' : 'pb-7']}>
	<h1 class="mx-auto max-w-2xl px-4 pt-1">
		<Logo kind="wordmark" label={cafe.name} class="mx-auto h-26 w-auto" />
		<span class="sr-only"> — {t.menu}</span>
	</h1>
</div>

<!--
	Contacts on a card that overlaps the header. Guests usually scan the QR at the table, so it
	stays compact and the menu starts early. Lines the admin has not filled in are left out.
-->
{#if hasDetails}
	<div class="mx-auto -mt-8 mb-2 max-w-2xl px-4">
		<ul class="rounded-2xl border border-line bg-surface px-4 py-1.5 text-ink-soft shadow-card">
			{#if details.address || details.twoGisUrl}
				<li class="flex min-h-9 items-start gap-2.5 py-1.5">
					<Icon name="pin" class="mt-[0.2em] size-[1.125rem] text-accent-ink" />
					{#if details.address}
						<p class="min-w-0 flex-1">
							<span class="sr-only">{t.address}: </span>{details.address}
						</p>
					{/if}
					{#if details.twoGisUrl}
						<a
							href={details.twoGisUrl}
							target="_blank"
							rel="noopener"
							aria-label={t.openIn2gis}
							class="-my-0.5 inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border border-line bg-paper px-3 text-sm font-semibold whitespace-nowrap text-ink hover:border-ink-muted motion-safe:transition-colors"
						>
							2GIS<Icon name="external" class="size-3.5 text-ink-muted" />
						</a>
					{/if}
				</li>
			{/if}
			{#if details.hours}
				<li class="flex min-h-9 items-start gap-2.5 py-1.5">
					<Icon name="clock" class="mt-[0.2em] size-[1.125rem] text-accent-ink" />
					<p><span class="sr-only">{t.hours}: </span>{details.hours}</p>
				</li>
			{/if}
			{#if details.phone}
				<li class="flex min-h-9 items-start gap-2.5 py-1.5">
					<Icon name="phone" class="mt-[0.2em] size-[1.125rem] text-accent-ink" />
					<a
						href={telHref(details.phone)}
						class="font-semibold text-accent-ink underline decoration-current/30 underline-offset-4 hover:decoration-current"
					>
						<span class="sr-only">{t.call}: </span>{details.phone}
					</a>
				</li>
			{/if}
		</ul>
	</div>
{/if}
