/** Shared Tailwind class lists for the admin forms. */

export const input =
	'mt-1 block w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-ink-muted aria-invalid:border-accent focus:border-accent';

export const label = 'block text-sm font-semibold text-ink-soft';

export const fieldError = 'mt-1 text-sm font-medium text-accent-ink';

const buttonBase =
	'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 font-semibold whitespace-nowrap disabled:opacity-50';

export const primaryButton = `${buttonBase} bg-accent text-on-accent`;

export const secondaryButton = `${buttonBase} border border-line bg-surface text-ink`;

export const dangerButton = `${buttonBase} border border-accent/40 text-accent-ink`;

/** Small square buttons (↑ ↓ ×). */
export const iconButton =
	'grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-lg leading-none text-ink-soft disabled:opacity-30';
