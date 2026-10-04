<script lang="ts">
	import { enhance } from '$app/forms';
	import CategoryFields from '$lib/admin/CategoryFields.svelte';
	import { adminUi } from '$lib/admin/i18n';
	import { dangerButton, iconButton, primaryButton, secondaryButton } from '$lib/admin/styles';
	import { cafe } from '$lib/config';
	import { formatPrice } from '$lib/format';
	import { photoUrl } from '$lib/photos';
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

	/** The cafe details in the admin's language, for the summary card. */
	const cafeSummary = $derived(
		[
			{ label: t.address, value: kk ? data.cafe.addressKk : data.cafe.addressRu },
			{ label: t.hours, value: kk ? data.cafe.hoursKk : data.cafe.hoursRu },
			{ label: t.phone, value: data.cafe.phone },
			// Shown without "https://", cut off with an ellipsis if it does not fit.
			{ label: '2GIS', value: data.cafe.twoGisUrl?.replace(/^https?:\/\//, ''), oneLine: true }
		].filter((row): row is { label: string; value: string; oneLine?: boolean } => !!row.value)
	);

	const errorsFor = (formId: string) =>
		form?.formId === formId && 'errors' in form ? form.errors : undefined;
	const messageFor = (formId: string) =>
		form?.formId === formId && 'error' in form && form.error ? t[form.error] : undefined;
</script>

<svelte:head>
	<title>{t.title} — {cafe.name}</title>
</svelte:head>

<h1 class="sr-only">{t.title}</h1>

<section
	aria-labelledby="cafe-title"
	class="mb-8 flex flex-wrap items-start gap-x-4 gap-y-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
>
	<div class="min-w-0 flex-1 basis-64">
		<h2 id="cafe-title" class="font-display text-2xl leading-tight font-bold">{t.cafeDetails}</h2>
		{#if cafeSummary.length > 0}
			<dl class="mt-2 space-y-1">
				{#each cafeSummary as row (row.label)}
					<div class="flex gap-3">
						<dt class="w-[6.5rem] shrink-0 text-sm leading-6 text-ink-muted">{row.label}</dt>
						<dd class={['min-w-0', row.oneLine ? 'truncate' : 'break-words']}>{row.value}</dd>
					</div>
				{/each}
			</dl>
		{:else}
			<p class="mt-1 text-ink-soft">{t.cafeNotFilled}</p>
		{/if}
	</div>
	<a href="/admin/cafe" class={cafeSummary.length > 0 ? secondaryButton : primaryButton}>
		{cafeSummary.length > 0 ? t.editCafe : t.fillIn}
	</a>
</section>

<h2 class="font-display text-[2rem] leading-tight font-bold">{t.menu}</h2>

<div class="mt-5 space-y-6">
	{#each data.menu as category, index (category.id)}
		{@const formId = `category-${category.id}`}
		{@const errors = errorsFor(formId)}
		{@const message = messageFor(formId)}
		<section
			aria-labelledby="{formId}-title"
			class="rounded-2xl border border-line bg-surface shadow-card"
		>
			<div class="flex items-start gap-2 border-b border-line p-4">
				<div class="min-w-0 flex-1">
					<h3 id="{formId}-title" class="font-display text-2xl leading-tight font-bold">
						{kk ? category.nameKk : category.nameRu}
						{#if !category.visible}
							<span
								class="ml-1 inline-block rounded-full bg-badge px-2 py-px align-middle font-sans text-sm font-semibold text-ink-soft"
							>
								{t.hidden}
							</span>
						{/if}
					</h3>
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
							<a
								href="/admin/items/{item.id}"
								class="group/name flex min-w-0 flex-1 items-center gap-3"
							>
								{#if item.photoKey}
									<img
										src={photoUrl(item.photoKey)}
										alt=""
										width="48"
										height="48"
										loading="lazy"
										decoding="async"
										class={[
											'size-12 shrink-0 rounded-lg border border-line bg-white object-cover',
											!item.available && 'opacity-60 grayscale'
										]}
									/>
								{:else}
									<!-- No photo yet. -->
									<span
										aria-hidden="true"
										class="size-12 shrink-0 rounded-lg border border-dashed border-line"
									></span>
								{/if}
								<span class="min-w-0">
									<span
										class="block leading-snug font-semibold group-hover/name:underline"
										class:text-ink-muted={!item.available}
									>
										{nameOf(item)}
									</span>
									<span class="block text-sm text-ink-muted">{prices(item)}</span>
								</span>
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
	<h3 class="font-display text-2xl font-bold">{t.addSection}</h3>
	<form method="POST" action="?/createCategory" use:enhance class="mt-3">
		<CategoryFields {t} idPrefix="new-category" errors={errorsFor('new-category')} />
		<button class="{primaryButton} mt-3">{t.addSection}</button>
	</form>
</section>
