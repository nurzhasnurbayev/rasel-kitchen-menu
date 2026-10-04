<script lang="ts">
	import { mark, wordmark, type LogoArt } from './logo-art';

	const logos: [id: string, art: LogoArt][] = [
		['logo-wordmark', wordmark],
		['logo-mark', mark]
	];
</script>

<!--
	The logo artwork, once per page (from the root layout). <Logo> draws it with <use>, so showing
	the logo in several places (top bar, header, footer) does not repeat the path data.
	Zero-sized rather than display: none, which some browsers do not render <use> from.
-->
<svg width="0" height="0" style="position: absolute" aria-hidden="true" focusable="false">
	{#each logos as [id, { width, height, inset, primary, accent }] (id)}
		<symbol {id} viewBox="{inset} {inset} {width} {height}">
			<path fill="currentColor" fill-rule="evenodd" d={primary} />
			<path style="fill: var(--logo-accent, var(--color-orange))" fill-rule="evenodd" d={accent} />
		</symbol>
	{/each}
</svg>
