/**
 * Dish photo uploads. The admin page shrinks photos in the browser (to WebP, or JPEG where the
 * browser cannot encode WebP); the server accepts JPEG, PNG and WebP, and decides the type from the
 * file's first bytes, never from the name or the declared type.
 *
 * Every upload gets a new random key: /img responses are cached as immutable for a year, so an
 * object is never overwritten (see src/routes/img/[...key]/+server.ts).
 */

/** Upper limit for an upload; a photo shrunk in the browser is far smaller. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const TYPES = {
	'image/webp': 'webp',
	'image/jpeg': 'jpg',
	'image/png': 'png'
} as const;

export type PhotoType = keyof typeof TYPES;

export function sniffImageType(bytes: Uint8Array): PhotoType | null {
	const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
	if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return 'image/jpeg';
	}
	if (bytes.length >= 8 && ascii(1, 4) === 'PNG' && bytes[0] === 0x89) return 'image/png';
	return null;
}

/** A fresh, never-reused object key, e.g. items/12/0b7e…c1.webp */
export function newPhotoKey(itemId: number, type: PhotoType): string {
	return `items/${itemId}/${crypto.randomUUID()}.${TYPES[type]}`;
}
