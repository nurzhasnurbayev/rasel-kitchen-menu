/** Narrow no-break space: a thin gap between digit groups that never wraps. */
const GROUP_SEPARATOR = ' ';
/** No-break space between the amount and the currency sign. */
const NBSP = ' ';

/**
 * Formats an integer amount in tenge: 2000 → "2 000 ₸".
 *
 * Done by hand instead of `Intl.NumberFormat` so the output is identical on the
 * server (workerd) and in every browser, whatever ICU data they ship.
 */
export function formatPrice(tenge: number): string {
	const digits = Math.round(Math.abs(tenge)).toString();
	const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
	return `${tenge < 0 ? '−' : ''}${grouped}${NBSP}₸`;
}
