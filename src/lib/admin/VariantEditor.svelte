<script lang="ts">
	import type { FieldErrors } from '$lib/server/admin/forms';
	import type { Variant } from '$lib/server/db/schema';
	import type { AdminDictionary } from './i18n';
	import { fieldError, iconButton, input, label, secondaryButton } from './styles';

	let {
		t,
		variants,
		errors = {}
	}: { t: AdminDictionary; variants: Variant[]; errors?: FieldErrors } = $props();

	interface Row {
		/** Stable key for the {#each} block; not sent. */
		key: number;
		id: number | null;
		labelKk: string;
		labelRu: string;
		price: string;
		onRequest: boolean;
	}

	let nextKey = 0;
	const blank = (): Row => ({
		key: nextKey++,
		id: null,
		labelKk: '',
		labelRu: '',
		price: '',
		onRequest: false
	});

	// The parent remounts this editor after every successful save ({#key}), so rows start from the
	// saved variants, with their new ids.
	// svelte-ignore state_referenced_locally
	let rows = $state<Row[]>(
		variants.length
			? variants.map((v) => ({
					key: nextKey++,
					id: v.id,
					labelKk: v.labelKk ?? '',
					labelRu: v.labelRu ?? '',
					price: v.price === null ? '' : String(v.price),
					onRequest: v.price === null
				}))
			: [blank()]
	);

	function move(index: number, direction: -1 | 1) {
		const next = [...rows];
		[next[index], next[index + direction]] = [next[index + direction], next[index]];
		rows = next;
	}

	/** Field names match parseItemForm: variant.<position>.<field>. */
	const name = (index: number, field: string) => `variant.${index}.${field}`;
	const fieldId = (index: number, field: string) => `variant-${index}-${field}`;
	const errorOf = (index: number, field: string) => errors[name(index, field)];
</script>

<fieldset>
	<legend class="font-display text-xl font-bold">{t.prices}</legend>
	<p class="mt-1 text-sm text-ink-soft">{t.pricesHint}</p>
	{#if errors.variants}
		<p role="alert" class={fieldError}>{t.errors[errors.variants]}</p>
	{/if}

	<ol class="mt-3 space-y-3">
		{#each rows as row, index (row.key)}
			<li class="rounded-2xl border border-line bg-paper p-3">
				<div class="flex items-center gap-1.5">
					<span class="mr-auto text-sm font-semibold text-ink-muted"
						>{t.variantNumber(index + 1)}</span
					>
					<button
						type="button"
						class={iconButton}
						aria-label="{t.moveUp}: {t.variantNumber(index + 1)}"
						disabled={index === 0}
						onclick={() => move(index, -1)}>↑</button
					>
					<button
						type="button"
						class={iconButton}
						aria-label="{t.moveDown}: {t.variantNumber(index + 1)}"
						disabled={index === rows.length - 1}
						onclick={() => move(index, 1)}>↓</button
					>
					<button
						type="button"
						class={iconButton}
						aria-label="{t.removeVariant}: {t.variantNumber(index + 1)}"
						disabled={rows.length === 1}
						onclick={() => (rows = rows.filter((r) => r !== row))}>×</button
					>
				</div>

				{#if row.id !== null}
					<input type="hidden" name={name(index, 'id')} value={row.id} />
				{/if}

				<div class="mt-2 grid gap-3 sm:grid-cols-[1fr_1fr_9rem]">
					{#each [['labelKk', t.labelKk, 'kk'], ['labelRu', t.labelRu, 'ru']] as const as [field, text, lang] (field)}
						<div>
							<label for={fieldId(index, field)} class={label}>
								{text} <span class="font-normal text-ink-muted">({t.optional})</span>
							</label>
							<input
								id={fieldId(index, field)}
								name={name(index, field)}
								{lang}
								bind:value={row[field]}
								maxlength="40"
								autocomplete="off"
								aria-invalid={errorOf(index, field) ? 'true' : undefined}
								class={input}
							/>
							{#if errorOf(index, field)}
								<p class={fieldError}>{t.errors[errorOf(index, field)]}</p>
							{/if}
						</div>
					{/each}
					<div>
						<label for={fieldId(index, 'price')} class={label}>{t.price}</label>
						<input
							id={fieldId(index, 'price')}
							name={name(index, 'price')}
							bind:value={row.price}
							inputmode="numeric"
							autocomplete="off"
							required={!row.onRequest}
							disabled={row.onRequest}
							aria-invalid={errorOf(index, 'price') ? 'true' : undefined}
							class="{input} tabular-nums disabled:opacity-40"
						/>
						{#if errorOf(index, 'price')}
							<p class={fieldError}>{t.errors[errorOf(index, 'price')]}</p>
						{/if}
					</div>
				</div>
				<label class="mt-2 flex min-h-11 items-center gap-3">
					<input
						type="checkbox"
						name={name(index, 'onRequest')}
						bind:checked={row.onRequest}
						class="size-5 accent-accent"
					/>
					<span>{t.priceOnRequest}</span>
				</label>
			</li>
		{/each}
	</ol>

	<button
		type="button"
		class="{secondaryButton} mt-3"
		disabled={rows.length >= 12}
		onclick={() => (rows = [...rows, blank()])}
	>
		+ {t.addVariant}
	</button>
</fieldset>
