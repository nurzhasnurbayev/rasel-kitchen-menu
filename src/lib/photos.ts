/**
 * Dish photos live in the R2 bucket bound as PHOTOS and are served by the
 * /img/[...key] route. `photo_key` in the items table is the R2 object key.
 */

/** Allowed object keys: letters, digits, `-`, `_`, `.` and `/` separators, no empty segments or `..`. */
const PHOTO_KEY = /^(?!.*\.\.)[A-Za-z0-9_-][A-Za-z0-9._-]*(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/;

export function isValidPhotoKey(key: string): boolean {
	return key.length <= 512 && PHOTO_KEY.test(key);
}

/** Public URL of a photo, e.g. 'items/12/a1b2c3.webp' → '/img/items/12/a1b2c3.webp'. */
export function photoUrl(key: string): string {
	return `/img/${key.split('/').map(encodeURIComponent).join('/')}`;
}
