<script lang="ts">
	import { enhance } from '$app/forms';
	import CategoryFields from '$lib/admin/CategoryFields.svelte';
	import { adminUi } from '$lib/admin/i18n';
	import { dangerButton, iconButton, primaryButton, secondaryButton } from '$lib/admin/styles';
	import { cafe } from '$lib/config';
	import { formatPrice } from '$lib/format';
	import type { AdminItem } from '$lib/server/admin/repo';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(adminUi[data.lang]);
	const kk = $derived(data.lang === 'kk');

	/** Keep what was typed in edit forms; the reloaded data fills them anyway. */
	const keepValues: SubmitFunction = () => {
		return ({ update }) => update({ reset: false });
	};

	/** Asks before a destructive action; cancels the submit if the admin says no. */
	const confirming =
		(message: string): SubmitFunction =>
		({ cancel }) => {
			if (!confirm(message)) cancel();
			return ({ update }) => update({ reset: false });
		};

	const nameOf = (row: { nameKk: string; nameRu: string }) => (kk ? row.nameKk : row.nameRu);

	function prices(item: AdminItem) {
		return item.variants
			.map((v) => {
				const label = kk ? v.labelKk : v.labelRu;
				const price = v.price === null ? t.priceOnRequest : formatPrice(v.price);
				return label ? `${label} ${price}` : price;
			})
			.join(' · ');
	}

	const errorsFor = (formId: string) =>
		form?.formId === formId && 'errors' in form ? form.errors : undefined;
	const messageFor = (formId: string) =>
		form?.formId === formId && 'error' in form && form.error ? t[form.error] : undefined;
</script>

<svelte:head>
	<title>{t.title} — {cafe.name}</title>
</svelte:head>

<h1 class="font-display text-[2rem] leading-tight font-bold">{t.menu}</h1>

<div class="mt-5 space-y-6">
	{#each data.menu as category, index (category.id)}
		{@const formId = `category-${category.id}`}
		{@const errors = errorsFor(formId)}
		{@const message = messageFor(formId)}
		<section
			aria-labelledby="{formId}-title"
			class="rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(42_28_19/0.05)]"
		>
			<div class="flex items-start gap-2 border-b border-line p-4">
				<div class="min-w-0 flex-1">
					<h2 id="{formId}-title" class="font-display text-2xl leading-tight font-bold">
						{kk ? category.nameKk : category.nameRu}
						{#if !category.visible}
							<span
								class="ml-1 inline-block rounded-full bg-badge px-2 py-px align-middle font-sans text-sm font-semibold text-ink-soft"
							>
								{t.hidden}
							</span>
						{/if}
					</h2>
					<p class="text-sm text-ink-muted" lang={kk ? 'ru' : 'kk'}>
						{kk ? category.nameRu : category.nameKk}
					</p>
				</div>
				<form method="POST" action="?/moveCategory" use:enhance={keepValues} class="flex gap-1.5">
					<input type="hidden" name="id" value={category.id} />
					<button
						name="direction"
						value="up"
						class={iconButton}
						aria-label="{t.moveUp}: {nameOf(category)}"
						disabled={index === 0}>↑</button
					>
					<button
						name="direction"
						value="down"
						class={iconButton}
						aria-label="{t.moveDown}: {nameOf(category)}"
						disabled={index === data.menu.length - 1}>↓</button
					>
				</form>
			</div>

			<details class="group border-b border-line" open={!!errors || !!message}>
				<summary
					class="flex min-h-11 cursor-pointer items-center gap-2 px-4 text-sm font-semibold text-accent-ink"
				>
					<span class="transition-transform group-open:rotate-90">›</span>
					{t.editSection}
				</summary>
				<div class="px-4 pb-4">
					<form method="POST" action="?/updateCategory" use:enhance={keepValues}>
						<input type="hidden" name="id" value={category.id} />
						<CategoryFields {t} idPrefix={formId} values={category} {errors} />
						<button class="{primaryButton} mt-3">{t.save}</button>
					</form>
					<form
						method="POST"
						action="?/deleteCategory"
						use:enhance={confirming(t.confirmDeleteSection)}
						class="mt-3"
					>
						<input type="hidden" name="id" value={category.id} />
						<button class={dangerButton} disabled={category.items.length > 0}>
							{t.deleteSection}
						</button>
						{#if category.items.length > 0}
							<p class="mt-1 text-sm text-ink-muted">{t.sectionNotEmpty}</p>
						{/if}
					</form>
					{#if message}
						<p role="alert" class="mt-2 font-medium text-accent-ink">{message}</p>
					{/if}
				</div>
			</details>

			{#if category.items.length === 0}
				<p class="px-4 py-4 text-ink-soft">{t.emptySection}</p>
			{:else}
				<ul class="divide-y divide-line">
					{#each category.items as item, itemIndex (item.id)}
						<li class="flex items-center gap-2 px-4 py-3">
							<a href="/admin/items/{item.id}" class="group/name min-w-0 flex-1">
								<span
									class="block leading-snug font-semibold group-hover/name:underline"
									class:text-ink-muted={!item.available}
								>
									{nameOf(item)}
									{#if item.photoKey}<span aria-hidden="true" class="text-ink-muted">· 📷</span
										>{/if}
								</span>
								<span class="block text-sm text-ink-muted">{prices(item)}</span>
							</a>
							<div class="flex items-center gap-1.5">
								<form method="POST" action="?/setAvailable" use:enhance={keepValues}>
									<input type="hidden" name="id" value={item.id} />
									<input type="hidden" name="available" value={item.available ? '0' : '1'} />
									<button
										class={[
											'min-h-10 rounded-full border px-2.5 text-sm font-semibold whitespace-nowrap',
											item.available
												? 'border-line bg-surface text-ink'
												: 'border-badge bg-badge text-ink-soft'
										]}
										aria-label="{item.available ? t.markSoldOut : t.markAvailable}: {nameOf(item)}"
										title={item.available ? t.markSoldOut : t.markAvailable}
									>
										{item.available ? `● ${t.availableShort}` : `○ ${t.soldOutShort}`}
									</button>
								</form>
								<form
									method="POST"
									action="?/moveItem"
									use:enhance={keepValues}
									class="flex gap-1.5"
								>
									<input type="hidden" name="id" value={item.id} />
									<button
										name="direction"
										value="up"
										class={iconButton}
										aria-label="{t.moveUp}: {nameOf(item)}"
										disabled={itemIndex === 0}>↑</button
									>
									<button
										name="direction"
										value="down"
										class={iconButton}
										aria-label="{t.moveDown}: {nameOf(item)}"
										disabled={itemIndex === category.items.length - 1}>↓</button
									>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="border-t border-line p-3">
				<a href="/admin/items/new?category={category.id}" class={secondaryButton}>
					+ {t.addDish}
				</a>
			</div>
		</section>
	{/each}
</div>

<section class="mt-8 rounded-2xl border border-dashed border-line p-4">
	<h2 class="font-display text-2xl font-bold">{t.addSection}</h2>
	<form method="POST" action="?/createCategory" use:enhance class="mt-3">
		<CategoryFields {t} idPrefix="new-category" errors={errorsFor('new-category')} />
		<button class="{primaryButton} mt-3">{t.addSection}</button>
	</form>
</section>
