<script lang="ts">
	import '../app.css';
	import LogoDefs from '$lib/brand/LogoDefs.svelte';

	let { children } = $props();
</script>

<LogoDefs />
{@render children()}
