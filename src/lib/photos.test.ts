import { describe, expect, it } from 'vitest';
import { isValidPhotoKey, photoUrl } from './photos';

describe('photo keys', () => {
	it('accepts simple nested keys', () => {
		expect(isValidPhotoKey('items/12/a1b2c3.webp')).toBe(true);
		expect(isValidPhotoKey('logo.png')).toBe(true);
	});

	it('rejects traversal, empty segments and odd characters', () => {
		for (const key of [
			'',
			'../x',
			'items/../x',
			'items//x',
			'/items/x',
			'items/x/',
			'a b.jpg',
			'é.jpg'
		]) {
			expect(isValidPhotoKey(key), key).toBe(false);
		}
	});

	it('builds the public URL', () => {
		expect(photoUrl('items/12/a1b2c3.webp')).toBe('/img/items/12/a1b2c3.webp');
	});
});
