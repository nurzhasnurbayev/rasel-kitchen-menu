<script lang="ts">
	import { enhance } from '$app/forms';
	import { adminUi } from '$lib/admin/i18n';
	import ItemForm from '$lib/admin/ItemForm.svelte';
	import PhotoForm from '$lib/admin/PhotoForm.svelte';
	import { dangerButton } from '$lib/admin/styles';
	import { cafe } from '$lib/config';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(adminUi[data.lang]);
	const kk = $derived(data.lang === 'kk');
	const name = $derived(kk ? data.item.nameKk : data.item.nameRu);
</script>

<svelte:head>
	<title>{name} — {cafe.name}</title>
</svelte:head>

<a href="/admin" class="inline-flex min-h-11 items-center font-semibold text-accent-ink"
	>← {t.back}</a
>
<h1 class="mt-1 mb-5 font-display text-[2rem] leading-tight font-bold">{name}</h1>

<!-- Remount after each save, so the variant rows pick up ids of newly added variants. -->
{#key data.item}
	<ItemForm
		{t}
		{kk}
		categories={data.categories}
		item={data.item}
		errors={form && 'errors' in form ? form.errors : undefined}
		submitLabel={t.save}
	/>
{/key}

<div class="mt-8 space-y-6">
	<PhotoForm
		{t}
		photoKey={data.item.photoKey}
		error={form && 'photoError' in form ? form.photoError : undefined}
	/>

	<form
		method="POST"
		action="?/delete"
		use:enhance={({ cancel }) => {
			if (!confirm(t.confirmDeleteDish)) cancel();
		}}
	>
		<button class={dangerButton}>{t.deleteDish}</button>
	</form>
</div>
