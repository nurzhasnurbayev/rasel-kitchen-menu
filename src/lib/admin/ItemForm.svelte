<script lang="ts">
	import { enhance } from '$app/forms';
	import type { FieldErrors } from '$lib/server/admin/forms';
	import type { Category, Variant } from '$lib/server/db/schema';
	import type { AdminDictionary } from './i18n';
	import { fieldError, input, label, primaryButton } from './styles';
	import VariantEditor from './VariantEditor.svelte';

	interface ItemValues {
		categoryId: number | null;
		nameKk: string;
		nameRu: string;
		descriptionKk: string | null;
		descriptionRu: string | null;
		available: boolean;
		variants: Variant[];
	}

	let {
		t,
		kk,
		categories,
		item,
		errors = {},
		submitLabel
	}: {
		t: AdminDictionary;
		kk: boolean;
		categories: Category[];
		item: ItemValues;
		errors?: FieldErrors;
		submitLabel: string;
	} = $props();

	let saving = $state(false);
	const hasErrors = $derived(Object.keys(errors).length > 0);
	const describedBy = (name: string) => (errors[name] ? `${name}-error` : undefined);
</script>

<form
	method="POST"
	action="?/save"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
	class="space-y-5"
>
	{#if hasErrors}
		<p role="alert" class="rounded-2xl bg-badge px-4 py-3 font-medium text-accent-ink">
			{t.fixErrors}
		</p>
	{/if}

	<div>
		<label for="categoryId" class={label}>{t.section}</label>
		<select
			id="categoryId"
			name="categoryId"
			required
			class={input}
			aria-invalid={errors.categoryId ? 'true' : undefined}
			aria-describedby={describedBy('categoryId')}
		>
			{#each categories as category (category.id)}
				<option value={category.id} selected={category.id === item.categoryId}>
					{kk ? category.nameKk : category.nameRu}
				</option>
			{/each}
		</select>
		{#if errors.categoryId}
			<p id="categoryId-error" class={fieldError}>{t.errors[errors.categoryId]}</p>
		{/if}
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		{#each [['nameKk', t.nameKk, 'kk'], ['nameRu', t.nameRu, 'ru']] as const as [name, text, lang] (name)}
			<div>
				<label for={name} class={label}>{text}</label>
				<input
					id={name}
					{name}
					{lang}
					value={item[name]}
					required
					maxlength="120"
					autocomplete="off"
					aria-invalid={errors[name] ? 'true' : undefined}
					aria-describedby={describedBy(name)}
					class={input}
				/>
				{#if errors[name]}
					<p id="{name}-error" class={fieldError}>{t.errors[errors[name]]}</p>
				{/if}
			</div>
		{/each}
		{#each [['descriptionKk', t.descriptionKk, 'kk'], ['descriptionRu', t.descriptionRu, 'ru']] as const as [name, text, lang] (name)}
			<div>
				<label for={name} class={label}>
					{text} <span class="font-normal text-ink-muted">({t.optional})</span>
				</label>
				<textarea
					id={name}
					{name}
					{lang}
					rows="3"
					maxlength="600"
					aria-invalid={errors[name] ? 'true' : undefined}
					aria-describedby={describedBy(name)}
					value={item[name] ?? ''}
					class={input}></textarea>
				{#if errors[name]}
					<p id="{name}-error" class={fieldError}>{t.errors[errors[name]]}</p>
				{/if}
			</div>
		{/each}
	</div>

	<div>
		<label class="flex min-h-11 items-center gap-3 font-semibold">
			<input
				type="checkbox"
				name="available"
				checked={item.available}
				class="size-5 accent-accent"
			/>
			{t.available}
		</label>
		<p class="text-sm text-ink-soft">{t.availableHint}</p>
	</div>

	<VariantEditor {t} variants={item.variants} {errors} />

	<div class="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-md">
		<button class="{primaryButton} w-full sm:w-auto" disabled={saving}>{submitLabel}</button>
	</div>
</form>
