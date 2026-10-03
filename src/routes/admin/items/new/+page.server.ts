import { fail, redirect } from '@sveltejs/kit';
import { adminDb, changed } from '$lib/server/admin/flash';
import { parseId, parseItemForm } from '$lib/server/admin/forms';
import { createItem, getCategories } from '$lib/server/admin/repo';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const categories = await getCategories(adminDb(event));
	const requested = parseId(event.url.searchParams.get('category'));
	const categoryId = categories.some((c) => c.id === requested)
		? requested
		: (categories[0]?.id ?? null);
	return { categories, categoryId };
};

export const actions: Actions = {
	save: async (event) => {
		const db = adminDb(event);
		const categories = await getCategories(db);
		const parsed = parseItemForm(
			await event.request.formData(),
			categories.map((c) => c.id)
		);
		if (!parsed.ok) return fail(400, { errors: parsed.errors });

		const id = await createItem(db, parsed.value);
		await changed(event);
		redirect(303, `/admin/items/${id}`);
	}
};
