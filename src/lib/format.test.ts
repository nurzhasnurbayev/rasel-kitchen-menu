import { describe, expect, it } from 'vitest';
import { formatPrice } from './format';

const NNBSP = ' ';
const NBSP = ' ';

describe('formatPrice', () => {
	it('groups thousands with a narrow no-break space and appends ₸', () => {
		expect(formatPrice(2000)).toBe(`2${NNBSP}000${NBSP}₸`);
		expect(formatPrice(1190)).toBe(`1${NNBSP}190${NBSP}₸`);
		expect(formatPrice(1234567)).toBe(`1${NNBSP}234${NNBSP}567${NBSP}₸`);
	});

	it('leaves amounts below a thousand ungrouped', () => {
		expect(formatPrice(0)).toBe(`0${NBSP}₸`);
		expect(formatPrice(180)).toBe(`180${NBSP}₸`);
		expect(formatPrice(999)).toBe(`999${NBSP}₸`);
	});

	it('never produces a breaking space', () => {
		expect(formatPrice(1990)).not.toMatch(/ /);
	});
});
