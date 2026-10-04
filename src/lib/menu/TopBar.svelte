<script lang="ts">
	import Logo from '$lib/brand/Logo.svelte';
	import { cafe } from '$lib/config';
	import type { Lang } from '$lib/i18n';
	import LangSwitcher from './LangSwitcher.svelte';

	let { lang }: { lang: Lang } = $props();
</script>

<!--
	The logo violet with the white monogram. The monogram appears once the big logo below has
	scrolled away ([data-topbar-mark] in app.css). Focus rings are white here: violet would not show.
-->
<header
	class="sticky top-0 z-30 bg-brand text-on-brand short:static [&_:focus-visible]:outline-on-brand"
>
	<div class="mx-auto flex h-(--topbar-h) max-w-2xl items-center gap-3 px-4">
		<a href="#top" data-scroll-top data-topbar-mark class="-ml-1 rounded-xl p-1">
			<Logo kind="mark" label={cafe.name} class="h-9 w-auto" />
		</a>
		<div class="ml-auto">
			<LangSwitcher {lang} tone="brand" />
		</div>
	</div>
</header>
