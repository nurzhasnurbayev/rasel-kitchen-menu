<script lang="ts">
	import { adminUi } from '$lib/admin/i18n';
	import ItemForm from '$lib/admin/ItemForm.svelte';
	import { cafe } from '$lib/config';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(adminUi[data.lang]);
</script>

<svelte:head>
	<title>{t.newDish} — {cafe.name}</title>
</svelte:head>

<a href="/admin" class="inline-flex min-h-11 items-center font-semibold text-accent-ink"
	>← {t.back}</a
>
<h1 class="mt-1 mb-5 font-display text-[2rem] leading-tight font-bold">{t.newDish}</h1>

<ItemForm
	{t}
	kk={data.lang === 'kk'}
	categories={data.categories}
	item={{
		categoryId: data.categoryId,
		nameKk: '',
		nameRu: '',
		descriptionKk: null,
		descriptionRu: null,
		available: true,
		variants: []
	}}
	errors={form?.errors}
	submitLabel={t.create}
/>

<p class="mt-6 text-sm text-ink-soft">{t.photoAfterSave}</p>
