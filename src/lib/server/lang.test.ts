import { describe, expect, it } from 'vitest';
import { matchAcceptLanguage, negotiateLang } from './lang';

describe('matchAcceptLanguage', () => {
	it('picks the supported language with the highest weight', () => {
		expect(matchAcceptLanguage('ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('ru');
		expect(matchAcceptLanguage('kk-KZ,kk;q=0.9,ru;q=0.8')).toBe('kk');
		expect(matchAcceptLanguage('ru;q=0.4,kk;q=0.8')).toBe('kk');
	});

	it('skips unsupported languages', () => {
		expect(matchAcceptLanguage('en-US,en;q=0.9,ru;q=0.5')).toBe('ru');
		expect(matchAcceptLanguage('en-US,en;q=0.9')).toBeNull();
		expect(matchAcceptLanguage('*')).toBeNull();
	});

	it('keeps header order for equal weights and ignores q=0', () => {
		expect(matchAcceptLanguage('ru, kk')).toBe('ru');
		expect(matchAcceptLanguage('ru;q=0, kk;q=0.1')).toBe('kk');
	});

	it('treats the non-standard "kz" as Kazakh', () => {
		expect(matchAcceptLanguage('kz')).toBe('kk');
	});

	it('handles missing or malformed headers', () => {
		expect(matchAcceptLanguage(null)).toBeNull();
		expect(matchAcceptLanguage('')).toBeNull();
		expect(matchAcceptLanguage(';;,,q=abc')).toBeNull();
	});
});

describe('negotiateLang', () => {
	it('prefers the saved cookie over Accept-Language', () => {
		expect(negotiateLang('kk', 'ru-RU')).toBe('kk');
		expect(negotiateLang('ru', 'kk-KZ')).toBe('ru');
	});

	it('ignores an invalid cookie', () => {
		expect(negotiateLang('en', 'ru-RU')).toBe('ru');
	});

	it('defaults to Kazakh', () => {
		expect(negotiateLang(undefined, null)).toBe('kk');
		expect(negotiateLang(undefined, 'de-DE,en;q=0.5')).toBe('kk');
	});
});
