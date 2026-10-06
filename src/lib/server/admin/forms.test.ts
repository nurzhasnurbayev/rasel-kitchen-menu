import { describe, expect, it } from 'vitest';
import {
	isPhone,
	parse2gisUrl,
	parseCafeForm,
	parseCategoryForm,
	parseItemForm,
	parsePrice
} from './forms';

const form = (fields: Record<string, string>) => {
	const data = new FormData();
	for (const [key, value] of Object.entries(fields)) data.append(key, value);
	return data;
};

const item = (fields: Record<string, string> = {}) =>
	form({
		categoryId: '4',
		nameKk: 'Компот',
		nameRu: 'Компот',
		available: 'on',
		'variant.0.id': '31',
		'variant.0.labelKk': '1 л',
		'variant.0.labelRu': '1 л',
		'variant.0.price': '900',
		'variant.1.labelKk': '0,5 л',
		'variant.1.labelRu': '0,5 л',
		'variant.1.price': '450',
		...fields
	});

describe('parsePrice', () => {
	it('accepts whole tenge with group separators', () => {
		expect(parsePrice('2000')).toBe(2000);
		expect(parsePrice(' 2 000 ₸ ')).toBe(2000);
		expect(parsePrice('2 000')).toBe(2000);
		expect(parsePrice('0')).toBe(0);
	});

	it('rejects everything else', () => {
		for (const value of ['', '-5', '12.5', '12,5', 'abc', '1e3', '99999999999', null]) {
			expect(parsePrice(value)).toBeNull();
		}
	});
});

describe('parseCategoryForm', () => {
	it('trims names and reads the checkbox', () => {
		expect(parseCategoryForm(form({ nameKk: '  Тәттілер ', nameRu: 'Десерты' }))).toEqual({
			ok: true,
			value: { nameKk: 'Тәттілер', nameRu: 'Десерты', visible: false }
		});
		expect(parseCategoryForm(form({ nameKk: 'a', nameRu: 'b', visible: 'on' }))).toMatchObject({
			value: { visible: true }
		});
	});

	it('requires both names', () => {
		expect(parseCategoryForm(form({ nameKk: ' ', nameRu: 'x'.repeat(200) }))).toEqual({
			ok: false,
			errors: { nameKk: 'required', nameRu: 'tooLong' }
		});
	});
});

describe('parseItemForm', () => {
	it('parses an item with its variants in order', () => {
		const result = parseItemForm(item({ descriptionRu: '  Домашний\r\n\r\n\r\n  ягодный  ' }), [4]);
		expect(result).toEqual({
			ok: true,
			value: {
				categoryId: 4,
				nameKk: 'Компот',
				nameRu: 'Компот',
				descriptionKk: null,
				descriptionRu: 'Домашний\n\nягодный',
				available: true,
				variants: [
					{ id: 31, labelKk: '1 л', labelRu: '1 л', price: 900 },
					{ id: null, labelKk: '0,5 л', labelRu: '0,5 л', price: 450 }
				]
			}
		});
	});

	it('orders variants by their index, not by field order', () => {
		const data = form({ categoryId: '1', nameKk: 'a', nameRu: 'b' });
		data.append('variant.10.labelKk', 'B');
		data.append('variant.10.labelRu', 'B');
		data.append('variant.10.price', '2');
		data.append('variant.2.labelKk', 'A');
		data.append('variant.2.labelRu', 'A');
		data.append('variant.2.price', '1');
		const result = parseItemForm(data, [1]);
		expect(result.ok && result.value.variants.map((v) => v.labelKk)).toEqual(['A', 'B']);
	});

	it('stores "price on request" as null and ignores the price field then', () => {
		const result = parseItemForm(
			form({
				categoryId: '6',
				nameKk: 'Кимчи',
				nameRu: 'Кимчи',
				'variant.0.price': 'whatever',
				'variant.0.onRequest': 'on'
			}),
			[6]
		);
		expect(result).toMatchObject({
			ok: true,
			value: {
				available: false,
				variants: [{ id: null, labelKk: null, labelRu: null, price: null }]
			}
		});
	});

	it('enforces at least one variant', () => {
		const result = parseItemForm(form({ categoryId: '1', nameKk: 'a', nameRu: 'b' }), [1]);
		expect(result).toEqual({ ok: false, errors: { variants: 'atLeastOneVariant' } });
	});

	it('reports every field problem at once', () => {
		const result = parseItemForm(
			item({
				categoryId: '99',
				nameRu: '',
				'variant.0.price': '',
				'variant.1.labelRu': '',
				'variant.1.price': '-1'
			}),
			[4]
		);
		expect(result).toEqual({
			ok: false,
			errors: {
				categoryId: 'unknownCategory',
				nameRu: 'required',
				'variant.0.price': 'required',
				'variant.1.labelRu': 'bothLanguages',
				'variant.1.price': 'invalidPrice'
			}
		});
	});

	it('requires labels when there are several variants, but not for a single one', () => {
		const unlabelled = {
			'variant.0.labelKk': '',
			'variant.0.labelRu': '',
			'variant.1.labelKk': '',
			'variant.1.labelRu': ''
		};
		expect(parseItemForm(item(unlabelled), [4])).toEqual({
			ok: false,
			errors: { 'variant.0.labelKk': 'labelsRequired', 'variant.1.labelKk': 'labelsRequired' }
		});
		const single = form({ categoryId: '4', nameKk: 'a', nameRu: 'b', 'variant.0.price': '5' });
		expect(parseItemForm(single, [4]).ok).toBe(true);
	});

	it('treats a repeated variant id as a new variant', () => {
		const result = parseItemForm(item({ 'variant.1.id': '31' }), [4]);
		expect(result.ok && result.value.variants.map((v) => v.id)).toEqual([31, null]);
	});

	it('limits the number of variants', () => {
		const data = form({ categoryId: '1', nameKk: 'a', nameRu: 'b' });
		for (let i = 0; i < 13; i++) {
			data.append(`variant.${i}.labelKk`, `${i}`);
			data.append(`variant.${i}.labelRu`, `${i}`);
			data.append(`variant.${i}.price`, '1');
		}
		expect(parseItemForm(data, [1])).toEqual({
			ok: false,
			errors: { variants: 'tooManyVariants' }
		});
	});
});

describe('isPhone', () => {
	it('accepts numbers as people write them', () => {
		for (const phone of ['+7 700 000 00 00', '8 (727) 123-45-67', '+77000000000', '25 00 00']) {
			expect(isPhone(phone), phone).toBe(true);
		}
	});

	it('rejects text, too few or too many digits', () => {
		for (const phone of ['abc', '+7 700 CALL', '1234', '+7 700 000 00 00 00 00 00', '+', '7+700']) {
			expect(isPhone(phone), phone).toBe(false);
		}
	});
});

describe('parse2gisUrl', () => {
	it('accepts 2GIS links and makes them https', () => {
		expect(parse2gisUrl('https://2gis.kz/almaty/firm/70000001')).toBe(
			'https://2gis.kz/almaty/firm/70000001'
		);
		expect(parse2gisUrl('2gis.kz/almaty/firm/70000001')).toBe(
			'https://2gis.kz/almaty/firm/70000001'
		);
		expect(parse2gisUrl('http://go.2gis.com/abcde')).toBe('https://go.2gis.com/abcde');
		expect(parse2gisUrl('https://2GIS.ru/moscow')).toBe('https://2gis.ru/moscow');
	});

	it('rejects every other address', () => {
		for (const link of [
			'https://evil.example/2gis.kz',
			'https://2gis.kz.evil.example/',
			'https://not2gis.kz/',
			'https://2gis.kz@evil.example/',
			'javascript:alert(1)',
			'ftp://2gis.kz/',
			'just some words'
		]) {
			expect(parse2gisUrl(link), link).toBeNull();
		}
	});
});

describe('parseCafeForm', () => {
	const filled = {
		addressKk: ' Алматы қ.,  Абай даңғылы, 1 ',
		addressRu: 'г. Алматы, пр. Абая, 1',
		hoursKk: 'Күн сайын 10:00–22:00',
		hoursRu: 'Ежедневно 10:00–22:00',
		phone: '+7 700 000 00 00',
		twoGisUrl: 'go.2gis.com/abcde',
		notesKk: 'Өз тамағыңызбен кіруге болмайды.\r\nҚызмет көрсету 10%',
		notesRu: '  У нас со своей едой нельзя. \n\n\n Обслуживание  10%\n'
	};

	it('parses and tidies the details', () => {
		expect(parseCafeForm(form(filled))).toEqual({
			ok: true,
			value: {
				addressKk: 'Алматы қ., Абай даңғылы, 1',
				addressRu: 'г. Алматы, пр. Абая, 1',
				hoursKk: 'Күн сайын 10:00–22:00',
				hoursRu: 'Ежедневно 10:00–22:00',
				phone: '+7 700 000 00 00',
				twoGisUrl: 'https://go.2gis.com/abcde',
				// One note per line, without blank lines in between.
				notesKk: 'Өз тамағыңызбен кіруге болмайды.\nҚызмет көрсету 10%',
				notesRu: 'У нас со своей едой нельзя.\nОбслуживание 10%'
			}
		});
	});

	it('stores empty fields as null', () => {
		expect(parseCafeForm(form({ addressKk: '', phone: '  ', notesKk: '\n \n' }))).toEqual({
			ok: true,
			value: {
				addressKk: null,
				addressRu: null,
				hoursKk: null,
				hoursRu: null,
				phone: null,
				twoGisUrl: null,
				notesKk: null,
				notesRu: null
			}
		});
	});

	it('wants the address, the hours and the notes in both languages', () => {
		expect(parseCafeForm(form({ ...filled, addressRu: '', hoursKk: '', notesRu: ' ' }))).toEqual({
			ok: false,
			errors: { addressRu: 'bothLanguages', hoursKk: 'bothLanguages', notesRu: 'bothLanguages' }
		});
	});

	it('reports a bad phone, a bad link and overlong text together', () => {
		expect(
			parseCafeForm(
				form({
					...filled,
					addressKk: 'а'.repeat(201),
					phone: 'call me',
					twoGisUrl: 'https://maps.example/cafe',
					notesRu: 'а'.repeat(401)
				})
			)
		).toEqual({
			ok: false,
			errors: {
				addressKk: 'tooLong',
				phone: 'invalidPhone',
				twoGisUrl: 'invalid2gisUrl',
				notesRu: 'tooLong'
			}
		});
	});
});
