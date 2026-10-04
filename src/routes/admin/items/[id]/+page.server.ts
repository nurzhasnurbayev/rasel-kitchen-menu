import { error, fail, redirect } from '@sveltejs/kit';
import type { PhotoError } from '$lib/admin/i18n';
import { adminDb, changed } from '$lib/server/admin/flash';
import { parseId, parseItemForm } from '$lib/server/admin/forms';
import { MAX_PHOTO_BYTES, newPhotoKey, sniffImageType } from '$lib/server/admin/photos';
import {
	deleteItem,
	getCategories,
	getItem,
	setItemPhoto,
	updateItem
} from '$lib/server/admin/repo';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

function itemId(params: { id: string }): number {
	const id = parseId(params.id);
	if (!id) error(404);
	return id;
}

export const load: PageServerLoad = async (event) => {
	const db = adminDb(event);
	const [item, categories] = await Promise.all([
		getItem(db, itemId(event.params)),
		getCategories(db)
	]);
	if (!item) error(404);
	return { item, categories };
};

function photos(event: RequestEvent) {
	const bucket = event.platform?.env.PHOTOS;
	if (!bucket) error(503, 'R2 binding "PHOTOS" is missing');
	return bucket;
}

/** Removes an R2 object that is no longer referenced. A failure only leaves an unused file. */
async function deletePhoto(event: RequestEvent, key: string | null) {
	if (!key) return;
	try {
		await photos(event).delete(key);
	} catch (err) {
		console.error('Could not delete photo', key, err);
	}
}

const photoFail = (status: number, photoError: PhotoError) => fail(status, { photoError });

export const actions: Actions = {
	save: async (event) => {
		const db = adminDb(event);
		const id = itemId(event.params);
		const categories = await getCategories(db);
		const parsed = parseItemForm(
			await event.request.formData(),
			categories.map((c) => c.id)
		);
		if (!parsed.ok) return fail(400, { errors: parsed.errors });
		if (!(await updateItem(db, id, parsed.value))) error(404);
		await changed(event);
	},

	/**
	 * Uploads a new photo under a new key, points the item at it, then deletes the old object.
	 * Objects are never overwritten: /img responses are cached as immutable.
	 */
	photo: async (event) => {
		const id = itemId(event.params);
		const file = (await event.request.formData()).get('photo');
		if (!(file instanceof File) || file.size === 0) return photoFail(400, 'missing');
		if (file.size > MAX_PHOTO_BYTES) return photoFail(413, 'tooBig');

		const bytes = new Uint8Array(await file.arrayBuffer());
		const type = sniffImageType(bytes);
		if (!type) return photoFail(415, 'type');

		const bucket = photos(event);
		const key = newPhotoKey(id, type);
		try {
			await bucket.put(key, bytes, { httpMetadata: { contentType: type } });
		} catch (err) {
			console.error('Photo upload to R2 failed', err);
			return photoFail(502, 'storage');
		}

		let replaced;
		try {
			replaced = await setItemPhoto(adminDb(event), id, key);
		} catch (err) {
			await deletePhoto(event, key);
			throw err;
		}
		if (!replaced) {
			await deletePhoto(event, key);
			error(404);
		}
		await deletePhoto(event, replaced.oldKey);
		await changed(event);
	},

	removePhoto: async (event) => {
		const replaced = await setItemPhoto(adminDb(event), itemId(event.params), null);
		if (!replaced) error(404);
		await deletePhoto(event, replaced.oldKey);
		await changed(event);
	},

	delete: async (event) => {
		const deleted = await deleteItem(adminDb(event), itemId(event.params));
		if (!deleted) error(404);
		await deletePhoto(event, deleted.photoKey);
		await changed(event, 'deleted');
		redirect(303, '/admin');
	}
};
