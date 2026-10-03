<script lang="ts">
	import { cafe } from '$lib/config';
	import type { Lang } from '$lib/i18n';
	import LangSwitcher from './LangSwitcher.svelte';
	import Logo from './Logo.svelte';

	let { lang }: { lang: Lang } = $props();
</script>

<header class="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-md short:static">
	<div class="mx-auto flex h-(--topbar-h) max-w-2xl items-center gap-3 px-4">
		<a href="#top" data-scroll-top class="-ml-1 flex min-w-0 items-center gap-2.5 rounded-full p-1">
			<Logo size={34} />
			<span class="truncate font-display text-[1.375rem] leading-none font-bold">{cafe.name}</span>
		</a>
		<div class="ml-auto">
			<LangSwitcher {lang} />
		</div>
	</div>
</header>
