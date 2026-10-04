import { fail } from '@sveltejs/kit';
import { adminDb, changed, parseDirection } from '$lib/server/admin/flash';
import { parseCategoryForm, parseId } from '$lib/server/admin/forms';
import {
	createCategory,
	deleteCategory,
	getAdminMenu,
	moveCategory,
	moveItem,
	setItemAvailable,
	updateCategory
} from '$lib/server/admin/repo';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	return { menu: await getAdminMenu(adminDb(event)) };
};

/**
 * Overview actions. Every result names the form it belongs to (`formId`), since the page has one
 * form per category.
 */
export const actions: Actions = {
	createCategory: async (event) => {
		const parsed = parseCategoryForm(await event.request.formData());
		if (!parsed.ok) return fail(400, { formId: 'new-category', errors: parsed.errors });
		await createCategory(adminDb(event), parsed.value);
		await changed(event);
	},

	updateCategory: async (event) => {
		const form = await event.request.formData();
		const id = parseId(form.get('id'));
		const formId = `category-${id}`;
		const parsed = parseCategoryForm(form);
		if (!parsed.ok) return fail(400, { formId, errors: parsed.errors });
		if (!id || !(await updateCategory(adminDb(event), id, parsed.value))) {
			return fail(404, { formId, error: 'notFound' as const });
		}
		await changed(event);
	},

	deleteCategory: async (event) => {
		const id = parseId((await event.request.formData()).get('id'));
		const formId = `category-${id}`;
		const result = id ? await deleteCategory(adminDb(event), id) : 'not-found';
		if (result === 'not-empty') return fail(409, { formId, error: 'sectionNotEmpty' as const });
		if (result === 'not-found') return fail(404, { formId, error: 'notFound' as const });
		await changed(event, 'deleted');
	},

	moveCategory: async (event) => {
		const form = await event.request.formData();
		const id = parseId(form.get('id'));
		const direction = parseDirection(form.get('direction'));
		if (id && direction && (await moveCategory(adminDb(event), id, direction))) {
			await changed(event);
		}
	},

	moveItem: async (event) => {
		const form = await event.request.formData();
		const id = parseId(form.get('id'));
		const direction = parseDirection(form.get('direction'));
		if (id && direction && (await moveItem(adminDb(event), id, direction))) {
			await changed(event);
		}
	},

	setAvailable: async (event) => {
		const form = await event.request.formData();
		const id = parseId(form.get('id'));
		const available = form.get('available') === '1';
		if (!id || !(await setItemAvailable(adminDb(event), id, available))) {
			return fail(404, { formId: `item-${id}`, error: 'notFound' as const });
		}
		await changed(event);
	}
};
