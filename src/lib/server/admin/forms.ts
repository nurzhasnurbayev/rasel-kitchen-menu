/**
 * Parsing and validation of the admin forms. Pure functions: FormData in, typed input or field
 * errors out. Error values are codes; the admin UI shows them in Kazakh or Russian.
 */

export type ErrorCode =
	| 'required'
	| 'tooLong'
	| 'invalidPrice'
	| 'bothLanguages'
	| 'labelsRequired'
	| 'atLeastOneVariant'
	| 'tooManyVariants'
	| 'unknownCategory'
	| 'invalidPhone'
	| 'invalid2gisUrl';

/** Field name (as in the form) → error. Variant fields are named `variant.<index>.<field>`. */
export type FieldErrors = Record<string, ErrorCode>;

export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

export const LIMITS = {
	name: 120,
	description: 600,
	label: 40,
	/** Highest accepted price, in tenge. */
	price: 10_000_000,
	variants: 12,
	address: 200,
	hours: 120,
	phone: 40,
	url: 300,
	/** All the notes in one language, newlines included. */
	notes: 400
} as const;

export interface CategoryInput {
	nameKk: string;
	nameRu: string;
	visible: boolean;
}

export interface VariantInput {
	/** Existing variant to update; null adds a new one. */
	id: number | null;
	labelKk: string | null;
	labelRu: string | null;
	/** Whole tenge; null means "price on request". */
	price: number | null;
}

/** The cafe's contact details. Null means "not filled in": the menu leaves that line out. */
export interface CafeInput {
	addressKk: string | null;
	addressRu: string | null;
	hoursKk: string | null;
	hoursRu: string | null;
	phone: string | null;
	twoGisUrl: string | null;
	/** Notes for guests, one per line (e.g. "Обслуживание 10%"). */
	notesKk: string | null;
	notesRu: string | null;
}

export interface ItemInput {
	categoryId: number;
	nameKk: string;
	nameRu: string;
	descriptionKk: string | null;
	descriptionRu: string | null;
	available: boolean;
	/** In display order; at least one. */
	variants: VariantInput[];
}

/** Text field: trimmed, inner whitespace runs collapsed (but newlines kept), '' → null. */
function text(form: FormData, name: string): string | null {
	const value = form.get(name);
	if (typeof value !== 'string') return null;
	const cleaned = value
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.map((line) => line.replace(/[ \t  ]+/g, ' ').trim())
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
	return cleaned || null;
}

const checked = (form: FormData, name: string) => form.get(name) !== null;

/** Positive integer id, or null. */
export function parseId(value: unknown): number | null {
	if (typeof value !== 'string' || !/^\d{1,9}$/.test(value)) return null;
	const id = Number(value);
	return id > 0 ? id : null;
}

/** "2 000", "2000", "2 000 ₸" → 2000. Null for anything else (decimals, negatives, text). */
export function parsePrice(value: string | null): number | null {
	if (value === null) return null;
	const digits = value.replace(/[\s  ₸]/g, '');
	if (!/^\d{1,9}$/.test(digits)) return null;
	const price = Number(digits);
	return price <= LIMITS.price ? price : null;
}

function requiredText(
	form: FormData,
	name: string,
	max: number,
	errors: FieldErrors
): string | null {
	const value = text(form, name);
	if (!value) errors[name] = 'required';
	else if (value.length > max) errors[name] = 'tooLong';
	return value;
}

function optionalText(form: FormData, name: string, max: number, errors: FieldErrors) {
	const value = text(form, name);
	if (value && value.length > max) errors[name] = 'tooLong';
	return value;
}

export function parseCategoryForm(form: FormData): Parsed<CategoryInput> {
	const errors: FieldErrors = {};
	const nameKk = requiredText(form, 'nameKk', LIMITS.name, errors);
	const nameRu = requiredText(form, 'nameRu', LIMITS.name, errors);
	if (Object.keys(errors).length) return { ok: false, errors };
	return {
		ok: true,
		value: { nameKk: nameKk!, nameRu: nameRu!, visible: checked(form, 'visible') }
	};
}

/**
 * The item form, including its variants.
 * @param categoryIds the categories that exist, to validate the category choice
 */
export function parseItemForm(form: FormData, categoryIds: number[]): Parsed<ItemInput> {
	const errors: FieldErrors = {};

	const categoryId = parseId(form.get('categoryId'));
	if (categoryId === null || !categoryIds.includes(categoryId)) {
		errors.categoryId = 'unknownCategory';
	}
	const nameKk = requiredText(form, 'nameKk', LIMITS.name, errors);
	const nameRu = requiredText(form, 'nameRu', LIMITS.name, errors);
	const descriptionKk = optionalText(form, 'descriptionKk', LIMITS.description, errors);
	const descriptionRu = optionalText(form, 'descriptionRu', LIMITS.description, errors);

	// Variant rows, in the order of their index in the field names.
	const indexes = new Set<number>();
	for (const key of form.keys()) {
		const match = /^variant\.(\d{1,3})\./.exec(key);
		if (match) indexes.add(Number(match[1]));
	}
	const sorted = [...indexes].sort((a, b) => a - b);

	const variants: VariantInput[] = [];
	for (const index of sorted) {
		const field = (name: string) => `variant.${index}.${name}`;
		const labelKk = text(form, field('labelKk'));
		const labelRu = text(form, field('labelRu'));
		const onRequest = checked(form, field('onRequest'));
		const priceText = text(form, field('price'));
		const price = onRequest ? null : parsePrice(priceText);

		if (!onRequest && price === null) {
			errors[field('price')] = priceText === null ? 'required' : 'invalidPrice';
		}
		for (const [name, label] of [
			['labelKk', labelKk],
			['labelRu', labelRu]
		] as const) {
			if (label && label.length > LIMITS.label) errors[field(name)] = 'tooLong';
		}
		// The database requires a label in both languages or in neither.
		if (!labelKk !== !labelRu) errors[field(labelKk ? 'labelRu' : 'labelKk')] = 'bothLanguages';

		variants.push({ id: parseId(form.get(field('id'))), labelKk, labelRu, price });
	}

	if (variants.length === 0) errors.variants = 'atLeastOneVariant';
	if (variants.length > LIMITS.variants) errors.variants = 'tooManyVariants';
	// Several sizes or choices must be told apart, on the menu and in the guest's basket.
	if (variants.length > 1) {
		sorted.forEach((index, i) => {
			const field = `variant.${index}.labelKk`;
			if (!variants[i].labelKk && !variants[i].labelRu && !errors[field]) {
				errors[field] = 'labelsRequired';
			}
		});
	}
	// The same existing variant twice would be saved twice; treat repeats as new rows.
	const seen = new Set<number>();
	for (const variant of variants) {
		if (variant.id !== null && seen.has(variant.id)) variant.id = null;
		if (variant.id !== null) seen.add(variant.id);
	}

	if (Object.keys(errors).length) return { ok: false, errors };
	return {
		ok: true,
		value: {
			categoryId: categoryId!,
			nameKk: nameKk!,
			nameRu: nameRu!,
			descriptionKk,
			descriptionRu,
			available: checked(form, 'available'),
			variants
		}
	};
}

/**
 * A phone number as people write it: digits with an optional leading +, spaces, brackets and
 * dashes. 5 to 15 digits (15 is the longest international number).
 */
export function isPhone(value: string): boolean {
	const digits = value.replace(/\D/g, '').length;
	return /^\+?[\d\s()-]+$/.test(value) && digits >= 5 && digits <= 15;
}

/**
 * A link to 2GIS (2gis.kz, 2gis.ru, go.2gis.com, …), normalised to https. Null for anything else:
 * the link is shown to guests, so it must not lead anywhere unexpected.
 */
export function parse2gisUrl(value: string): string | null {
	let url: URL;
	try {
		url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
	} catch {
		return null;
	}
	if (!/(^|\.)2gis\.[a-z]{2,}$/i.test(url.hostname) || url.username || url.password) return null;
	url.protocol = 'https:';
	return url.href;
}

/** The cafe details form. Every field may be left empty. */
export function parseCafeForm(form: FormData): Parsed<CafeInput> {
	const errors: FieldErrors = {};

	const addressKk = optionalText(form, 'addressKk', LIMITS.address, errors);
	const addressRu = optionalText(form, 'addressRu', LIMITS.address, errors);
	const hoursKk = optionalText(form, 'hoursKk', LIMITS.hours, errors);
	const hoursRu = optionalText(form, 'hoursRu', LIMITS.hours, errors);
	// One note per line; blank lines between them are dropped.
	const noteLines = (value: string | null) => value?.split('\n').filter(Boolean).join('\n') || null;
	const notesKk = noteLines(optionalText(form, 'notesKk', LIMITS.notes, errors));
	const notesRu = noteLines(optionalText(form, 'notesRu', LIMITS.notes, errors));
	// Guests read the menu in either language, and the database requires both or neither.
	for (const [kkName, kk, ruName, ru] of [
		['addressKk', addressKk, 'addressRu', addressRu],
		['hoursKk', hoursKk, 'hoursRu', hoursRu],
		['notesKk', notesKk, 'notesRu', notesRu]
	] as const) {
		if (!kk !== !ru) errors[kk ? ruName : kkName] ??= 'bothLanguages';
	}

	const phone = optionalText(form, 'phone', LIMITS.phone, errors);
	if (phone && !errors.phone && !isPhone(phone)) errors.phone = 'invalidPhone';

	const link = optionalText(form, 'twoGisUrl', LIMITS.url, errors);
	const twoGisUrl = link ? parse2gisUrl(link) : null;
	if (link && !errors.twoGisUrl && !twoGisUrl) errors.twoGisUrl = 'invalid2gisUrl';

	if (Object.keys(errors).length) return { ok: false, errors };
	return {
		ok: true,
		value: { addressKk, addressRu, hoursKk, hoursRu, phone, twoGisUrl, notesKk, notesRu }
	};
}
