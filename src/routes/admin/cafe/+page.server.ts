import { fail } from '@sveltejs/kit';
import { adminDb, changed } from '$lib/server/admin/flash';
import { parseCafeForm } from '$lib/server/admin/forms';
import { getCafe, saveCafe } from '$lib/server/admin/repo';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	return { cafe: await getCafe(adminDb(event)) };
};

export const actions: Actions = {
	save: async (event) => {
		const form = await event.request.formData();
		const parsed = parseCafeForm(form);
		if (!parsed.ok) {
			// Hand back what was typed, so the form does not fall back to the saved values.
			const values = Object.fromEntries(
				['addressKk', 'addressRu', 'hoursKk', 'hoursRu', 'phone', 'twoGisUrl'].map((name) => [
					name,
					String(form.get(name) ?? '')
				])
			);
			return fail(400, { errors: parsed.errors, values });
		}
		await saveCafe(adminDb(event), parsed.value);
		await changed(event);
	}
};
