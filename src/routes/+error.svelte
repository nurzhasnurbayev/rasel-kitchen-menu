<script lang="ts">
	import { page } from '$app/state';
	import { cafe } from '$lib/config';
	import { LANGS, ui } from '$lib/i18n';

	// The error can happen outside /kk and /ru, so the message is shown in both languages.
	const notFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{page.status} — {cafe.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16 text-center">
	<p class="font-display text-6xl font-bold text-accent-ink">{page.status}</p>
	{#each LANGS as lang (lang)}
		<p {lang} class="mt-3 text-xl font-semibold first-of-type:mt-6">
			{notFound ? ui[lang].notFound : ui[lang].somethingWentWrong}
		</p>
	{/each}
	<ul class="mt-8 flex flex-col items-center gap-3">
		{#each LANGS as lang (lang)}
			<li>
				<a
					href="/{lang}"
					{lang}
					hreflang={lang}
					class="inline-flex min-h-12 items-center rounded-full border border-line bg-surface px-6 font-semibold whitespace-nowrap"
				>
					{ui[lang].backToMenu}
				</a>
			</li>
		{/each}
	</ul>
</main>
