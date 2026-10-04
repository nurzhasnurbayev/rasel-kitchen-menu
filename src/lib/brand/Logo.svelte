<script lang="ts">
	import { mark, wordmark } from './logo-art';

	let {
		kind,
		label,
		class: className
	}: {
		/** `wordmark` is the full "Rasel kitchen" logo; `mark` is the RK monogram for small sizes. */
		kind: 'wordmark' | 'mark';
		/** Accessible name. Leave it out where the cafe's name is already announced nearby. */
		label?: string;
		class?: string;
	} = $props();

	const art = $derived(kind === 'mark' ? mark : wordmark);
</script>

<!--
	The violet part of the logo takes the text colour (white on the violet header, `text-logo`
	elsewhere); the orange part stays orange. Size it by height: `h-9 w-auto`.
-->
<svg
	viewBox="0 0 {art.width} {art.height}"
	class={className}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	focusable="false"
>
	<use href="#logo-{kind}" />
</svg>
