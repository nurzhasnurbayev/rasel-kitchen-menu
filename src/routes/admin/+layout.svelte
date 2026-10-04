<script lang="ts">
	import './admin.css';
	import { adminUi } from '$lib/admin/i18n';
	import Logo from '$lib/brand/Logo.svelte';
	import { cafe } from '$lib/config';
	import LangSwitcher from '$lib/menu/LangSwitcher.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const t = $derived(adminUi[data.lang]);
	const flashText = $derived(
		data.flash
			? [data.flash.message === 'deleted' ? t.deleted : t.saved, t.purge[data.flash.purge]]
					.filter(Boolean)
					.join(' ')
			: ''
	);
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- data-admin switches the page to the admin palette (see admin.css). -->
<header data-admin class="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-md">
	<div class="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
		<a href="/admin" class="-ml-1 flex min-w-0 items-center gap-3 rounded-xl p-1">
			<Logo kind="mark" label={cafe.name} class="h-9 w-auto shrink-0 text-logo" />
			<span class="truncate font-display text-xl leading-none font-bold">{t.title}</span>
		</a>
		<div class="ml-auto">
			<LangSwitcher lang={data.lang} href={(option) => `?lang=${option}`} remember={false} />
		</div>
	</div>
	{#if data.dev}
		<p class="bg-badge px-4 py-1 text-center text-sm text-ink-soft">{t.devMode}</p>
	{/if}
</header>

<div class="mx-auto max-w-3xl px-4 pt-4 pb-16">
	<!-- A <div role="status"> that is always present, so screen readers announce new messages. -->
	<div role="status" class="empty:hidden">
		{#if flashText}
			<p class="mb-4 rounded-2xl border border-accent/30 bg-surface px-4 py-3 font-medium text-ink">
				✓ {flashText}
			</p>
		{/if}
	</div>

	{@render children()}
</div>

<footer
	class="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-4 py-6 text-sm text-ink-soft"
>
	<a href="/{data.lang}" target="_blank" rel="noopener" class="font-semibold text-accent-ink">
		{t.openMenu} ↗
	</a>
	{#if data.email}
		<span class="ml-auto">{t.signedInAs} {data.email}</span>
		<!-- Cloudflare Access's own sign-out URL; reloads to the Access login afterwards. -->
		<a href="/cdn-cgi/access/logout" data-sveltekit-reload class="font-semibold underline">
			{t.signOut}
		</a>
	{/if}
</footer>
