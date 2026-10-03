<script lang="ts">
	import type { FieldErrors } from '$lib/server/admin/forms';
	import type { AdminDictionary } from './i18n';
	import { fieldError, input, label } from './styles';

	let {
		t,
		idPrefix,
		values = { nameKk: '', nameRu: '', visible: true },
		errors = {}
	}: {
		t: AdminDictionary;
		idPrefix: string;
		values?: { nameKk: string; nameRu: string; visible: boolean };
		errors?: FieldErrors;
	} = $props();
</script>

<div class="grid gap-3 sm:grid-cols-2">
	{#each [['nameKk', t.nameKk, 'kk'], ['nameRu', t.nameRu, 'ru']] as const as [name, text, lang] (name)}
		<div>
			<label for="{idPrefix}-{name}" class={label}>{text}</label>
			<input
				id="{idPrefix}-{name}"
				{name}
				{lang}
				value={values[name]}
				required
				maxlength="120"
				autocomplete="off"
				aria-invalid={errors[name] ? 'true' : undefined}
				aria-describedby={errors[name] ? `${idPrefix}-${name}-error` : undefined}
				class={input}
			/>
			{#if errors[name]}
				<p id="{idPrefix}-{name}-error" class={fieldError}>{t.errors[errors[name]]}</p>
			{/if}
		</div>
	{/each}
</div>
<label class="mt-3 flex min-h-11 items-center gap-3">
	<input type="checkbox" name="visible" checked={values.visible} class="size-5 accent-accent" />
	<span>{t.visibleOnMenu}</span>
</label>
