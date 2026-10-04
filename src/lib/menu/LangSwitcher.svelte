<script lang="ts">
	import { LANGS, ui, type Lang } from '$lib/i18n';

	let {
		lang,
		href = (option: Lang) => `/${option}`,
		remember = true
	}: {
		lang: Lang;
		/** Link for each language; the menu's own pages by default. */
		href?: (option: Lang) => string;
		/** Let enhance.js save the choice and keep the reading position (menu pages only). */
		remember?: boolean;
	} = $props();
</script>

<!--
	Plain links, so switching works without JavaScript. enhance.js additionally stores the
	choice in the `lang` cookie and keeps the guest at the same dish ([data-lang-switch]).
-->
<nav aria-label={ui[lang].languageSwitcher}>
	<ul class="flex rounded-full border border-line bg-surface p-[3px]">
		{#each LANGS as option (option)}
			<li>
				<a
					href={href(option)}
					hreflang={option}
					lang={option}
					data-lang-switch={remember ? option : undefined}
					aria-current={option === lang ? 'page' : undefined}
					class="flex h-9 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold tracking-wide text-ink-soft aria-[current=page]:bg-ink aria-[current=page]:text-paper motion-safe:transition-colors"
				>
					{ui[option].langShort}<span class="sr-only">&nbsp;— {ui[option].langName}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>
