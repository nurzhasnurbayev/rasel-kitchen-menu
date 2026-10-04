<script lang="ts">
	import { page } from '$app/state';
	import { cafe } from '$lib/config';
	import { LANGS, ui } from '$lib/i18n';
	import Basket from '$lib/menu/Basket.svelte';
	import CafeInfo from '$lib/menu/CafeInfo.svelte';
	import CategoryNav from '$lib/menu/CategoryNav.svelte';
	import { enhanceScriptTag } from '$lib/menu/enhance-script';
	import MenuSection from '$lib/menu/MenuSection.svelte';
	import SiteFooter from '$lib/menu/SiteFooter.svelte';
	import TopBar from '$lib/menu/TopBar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const t = $derived(ui[data.lang]);
	const origin = $derived(page.url.origin);
	const title = $derived(`${t.menu} — ${cafe.name}`);
	const description = $derived(t.metaDescription(cafe.name));
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href="{origin}/{data.lang}" />
	{#each LANGS as lang (lang)}
		<link rel="alternate" hreflang={lang} href="{origin}/{lang}" />
	{/each}
	<link rel="alternate" hreflang="x-default" href="{origin}/" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={cafe.name} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content="{origin}/{data.lang}" />
	<!-- The logo on its violet, shown when the link is shared (WhatsApp, Telegram, …). -->
	<meta property="og:image" content="{origin}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={cafe.name} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta property="og:locale" content={t.locale} />
	{#each LANGS.filter((lang) => lang !== data.lang) as lang (lang)}
		<meta property="og:locale:alternate" content={ui[lang].locale} />
	{/each}
</svelte:head>

<a
	href="#menu"
	class="sr-only z-50 rounded-full bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
>
	{t.skipToMenu}
</a>

<TopBar lang={data.lang} />
<CafeInfo lang={data.lang} details={data.cafe} />

<main id="menu">
	{#if data.menu.length > 0}
		<CategoryNav categories={data.menu} lang={data.lang} />
		<div class="mx-auto max-w-2xl space-y-10 px-4 pt-7">
			{#each data.menu as category (category.id)}
				<MenuSection {category} lang={data.lang} />
			{/each}
		</div>
	{:else}
		<p class="mx-auto max-w-2xl border-t border-line px-4 pt-10 text-center text-lg text-ink-soft">
			{t.menuEmpty}
		</p>
	{/if}
</main>

<SiteFooter lang={data.lang} details={data.cafe} />
<div data-menu-end aria-hidden="true" class="h-px"></div>

<Basket menu={data.menu} lang={data.lang} />

<!-- Inline, so the enhancement costs no extra request. -->
{@html enhanceScriptTag}
