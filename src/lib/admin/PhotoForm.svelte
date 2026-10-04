<script lang="ts">
	import { enhance } from '$app/forms';
	import { photoUrl } from '$lib/photos';
	import type { AdminDictionary, PhotoError } from './i18n';
	import { shrinkPhoto } from './shrink-photo';
	import { dangerButton, fieldError, primaryButton, secondaryButton } from './styles';

	let { t, photoKey, error }: { t: AdminDictionary; photoKey: string | null; error?: PhotoError } =
		$props();

	let fileInput = $state<HTMLInputElement>();
	let preview = $state<string | null>(null);
	let preparing = $state(false);
	let uploading = $state(false);

	/** Replaces the chosen file with a shrunk copy, so the plain form submit uploads that. */
	async function onChange() {
		const file = fileInput?.files?.[0];
		if (preview) URL.revokeObjectURL(preview);
		preview = null;
		if (!file || !fileInput) return;
		preparing = true;
		try {
			const small = await shrinkPhoto(file);
			if (small !== file) {
				const transfer = new DataTransfer();
				transfer.items.add(small);
				fileInput.files = transfer.files;
			}
			preview = URL.createObjectURL(small);
		} finally {
			preparing = false;
		}
	}

	$effect(() => () => {
		if (preview) URL.revokeObjectURL(preview);
	});
</script>

<section aria-labelledby="photo-title" class="rounded-2xl border border-line bg-surface p-4">
	<h2 id="photo-title" class="font-display text-xl font-bold">{t.photo}</h2>

	<div class="mt-3 flex flex-wrap items-start gap-4">
		{#if preview || photoKey}
			<img
				src={preview ?? photoUrl(photoKey!)}
				alt=""
				class="size-28 rounded-xl bg-badge object-cover"
			/>
		{:else}
			<div class="grid size-28 place-items-center rounded-xl bg-badge text-sm text-ink-muted">
				{t.noPhoto}
			</div>
		{/if}

		<div class="min-w-0 flex-1 space-y-3">
			<form
				method="POST"
				action="?/photo"
				enctype="multipart/form-data"
				use:enhance={() => {
					uploading = true;
					return async ({ update }) => {
						await update();
						uploading = false;
						if (preview) URL.revokeObjectURL(preview);
						preview = null;
					};
				}}
			>
				<label class="block">
					<span class="sr-only">{t.choosePhoto}</span>
					<input
						bind:this={fileInput}
						type="file"
						name="photo"
						accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
						required
						onchange={onChange}
						class="block w-full text-sm text-ink-soft file:mr-3 file:min-h-11 file:rounded-full file:border file:border-line file:bg-paper file:px-4 file:font-semibold file:text-ink"
					/>
				</label>
				<p class="mt-1 text-sm text-ink-muted" aria-live="polite">
					{preparing ? t.preparingPhoto : t.photoHint}
				</p>
				{#if error}
					<p role="alert" class={fieldError}>{t.photoErrors[error]}</p>
				{/if}
				<button
					class="{photoKey ? secondaryButton : primaryButton} mt-2"
					disabled={preparing || uploading}
				>
					{photoKey ? t.replacePhoto : t.uploadPhoto}
				</button>
			</form>

			{#if photoKey}
				<form
					method="POST"
					action="?/removePhoto"
					use:enhance={({ cancel }) => {
						if (!confirm(t.confirmRemovePhoto)) cancel();
					}}
				>
					<button class={dangerButton}>{t.removePhoto}</button>
				</form>
			{/if}
		</div>
	</div>
</section>
