<script lang="ts">
	import { enhance } from '$app/forms';
	import { adminUi } from '$lib/admin/i18n';
	import { fieldError, input, label, primaryButton } from '$lib/admin/styles';
	import { cafe } from '$lib/config';
	import type { CafeInput } from '$lib/server/admin/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(adminUi[data.lang]);

	const errors = $derived(form?.errors ?? {});
	/** After a rejected save: what was typed. Otherwise: what is saved. */
	const value = (name: keyof CafeInput) => form?.values?.[name] ?? data.cafe[name] ?? '';

	let saving = $state(false);

	// The maxlength values mirror LIMITS in $lib/server/admin/forms, which checks them again.
	const fields = $derived([
		{
			name: 'addressKk',
			text: t.addressKk,
			lang: 'kk',
			max: 200,
			placeholder: 'Алматы қ., Абай даңғылы, 1'
		},
		{
			name: 'addressRu',
			text: t.addressRu,
			lang: 'ru',
			max: 200,
			placeholder: 'г. Алматы, пр. Абая, 1'
		},
		{
			name: 'hoursKk',
			text: t.hoursKk,
			lang: 'kk',
			max: 120,
			placeholder: 'Күн сайын 10:00–22:00'
		},
		{
			name: 'hoursRu',
			text: t.hoursRu,
			lang: 'ru',
			max: 120,
			placeholder: 'Ежедневно 10:00–22:00'
		}
	] as const);
</script>

<svelte:head>
	<title>{t.cafeDetails} — {cafe.name}</title>
</svelte:head>

<a href="/admin" class="inline-flex min-h-11 items-center font-semibold text-accent-ink"
	>← {t.back}</a
>
<h1 class="mt-1 font-display text-[2rem] leading-tight font-bold">{t.cafeDetails}</h1>
<p class="mt-1 mb-5 text-ink-soft">{t.cafeDetailsHint}</p>

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
	{#if Object.keys(errors).length > 0}
		<p role="alert" class="rounded-2xl bg-badge px-4 py-3 font-medium text-accent-ink">
			{t.fixErrors}
		</p>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		{#each fields as field (field.name)}
			<div>
				<label for={field.name} class={label}>{field.text}</label>
				<input
					id={field.name}
					name={field.name}
					lang={field.lang}
					value={value(field.name)}
					maxlength={field.max}
					placeholder={field.placeholder}
					autocomplete="off"
					aria-invalid={errors[field.name] ? 'true' : undefined}
					aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
					class={input}
				/>
				{#if errors[field.name]}
					<p id="{field.name}-error" class={fieldError}>{t.errors[errors[field.name]]}</p>
				{/if}
			</div>
		{/each}
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div>
			<label for="phone" class={label}>{t.phone}</label>
			<input
				id="phone"
				name="phone"
				type="tel"
				inputmode="tel"
				value={value('phone')}
				maxlength="40"
				placeholder="+7 700 000 00 00"
				autocomplete="off"
				aria-invalid={errors.phone ? 'true' : undefined}
				aria-describedby={errors.phone ? 'phone-error' : 'phone-hint'}
				class={input}
			/>
			{#if errors.phone}
				<p id="phone-error" class={fieldError}>{t.errors[errors.phone]}</p>
			{:else}
				<p id="phone-hint" class="mt-1 text-sm text-ink-muted">{t.phoneHint}</p>
			{/if}
		</div>
		<div>
			<!-- A text field, not type="url": a link pasted without "https://" is accepted too. -->
			<label for="twoGisUrl" class={label}>{t.twoGis}</label>
			<input
				id="twoGisUrl"
				name="twoGisUrl"
				inputmode="url"
				value={value('twoGisUrl')}
				maxlength="300"
				placeholder="https://go.2gis.com/…"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				aria-invalid={errors.twoGisUrl ? 'true' : undefined}
				aria-describedby={errors.twoGisUrl ? 'twoGisUrl-error' : 'twoGisUrl-hint'}
				class={input}
			/>
			{#if errors.twoGisUrl}
				<p id="twoGisUrl-error" class={fieldError}>{t.errors[errors.twoGisUrl]}</p>
			{:else}
				<p id="twoGisUrl-hint" class="mt-1 text-sm text-ink-muted">{t.twoGisHint}</p>
			{/if}
		</div>
	</div>

	<div class="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-md">
		<button class="{primaryButton} w-full sm:w-auto" disabled={saving}>{t.save}</button>
	</div>
</form>
