<script lang="ts">
	import { LANGS, ui, type Lang } from '$lib/i18n';

	let {
		lang,
		href = (option: Lang) => `/${option}`,
		remember = true,
		tone = 'page'
	}: {
		lang: Lang;
		/** Link for each language; the menu's own pages by default. */
		href?: (option: Lang) => string;
		/** Let enhance.js save the choice and keep the reading position (menu pages only). */
		remember?: boolean;
		/** `brand` when it sits on the violet header, `page` on the page background. */
		tone?: 'page' | 'brand';
	} = $props();

	const tones = {
		page: {
			list: 'border border-line bg-surface',
			link: 'text-ink-soft aria-[current=page]:bg-accent aria-[current=page]:text-on-accent'
		},
		// White text needs a darker pill than the logo violet to stay readable.
		brand: {
			list: 'bg-black/20',
			link: 'text-on-brand aria-[current=page]:bg-on-brand aria-[current=page]:text-brand-deep'
		}
	};
</script>

<!--
	Plain links, so switching works without JavaScript. enhance.js additionally stores the
	choice in the `lang` cookie and keeps the guest at the same dish ([data-lang-switch]).
-->
<nav aria-label={ui[lang].languageSwitcher}>
	<ul class="flex rounded-full p-[3px] {tones[tone].list}">
		{#each LANGS as option (option)}
			<li>
				<a
					href={href(option)}
					hreflang={option}
					lang={option}
					data-lang-switch={remember ? option : undefined}
					aria-current={option === lang ? 'page' : undefined}
					class="flex h-9 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold tracking-wide motion-safe:transition-colors {tones[
						tone
					].link}"
				>
					{ui[option].langShort}<span class="sr-only">&nbsp;— {ui[option].langName}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>
