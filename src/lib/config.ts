/**
 * The cafe's name, as in the logo (src/lib/brand).
 *
 * The address, opening hours, phone and 2GIS link are not here: they are edited in the admin
 * panel (/admin/cafe) and stored in the database.
 */
export const cafe = {
	name: 'Rasel Kitchen'
} as const;

/** `tel:` link for a human-readable phone number: '+7 700 000 00 00' → 'tel:+77000000000'. */
export function telHref(phone: string): string {
	return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
