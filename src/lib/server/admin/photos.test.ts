import { describe, expect, it } from 'vitest';
import { isValidPhotoKey } from '$lib/photos';
import { newPhotoKey, sniffImageType } from './photos';

const bytes = (...values: (number | string)[]) =>
	new Uint8Array(
		values.flatMap((v) => (typeof v === 'string' ? [...v].map((c) => c.charCodeAt(0)) : [v]))
	);

describe('sniffImageType', () => {
	it('recognises WebP, JPEG and PNG by their signatures', () => {
		expect(sniffImageType(bytes('RIFF', 0, 0, 0, 0, 'WEBPVP8 '))).toBe('image/webp');
		expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
		expect(sniffImageType(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
	});

	it('rejects anything else', () => {
		expect(sniffImageType(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
		expect(sniffImageType(bytes('GIF89a'))).toBeNull();
		expect(sniffImageType(bytes('RIFF', 0, 0, 0, 0, 'WAVE'))).toBeNull();
		expect(sniffImageType(new Uint8Array())).toBeNull();
	});
});

describe('newPhotoKey', () => {
	it('makes a new valid key every time', () => {
		const a = newPhotoKey(12, 'image/webp');
		expect(a).toMatch(/^items\/12\/[0-9a-f-]{36}\.webp$/);
		expect(isValidPhotoKey(a)).toBe(true);
		expect(newPhotoKey(12, 'image/webp')).not.toBe(a);
		expect(newPhotoKey(3, 'image/jpeg')).toMatch(/\.jpg$/);
	});
});
