import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { getDb } from '../db';
import { purgeMenu, type PurgeResult } from '../purge';
import type { AdminDb } from './repo';

/** What the admin sees after a change: "Saved. Guests see it right away." */
export interface Flash {
	message: 'saved' | 'deleted';
	purge: PurgeResult;
}

const FLASH_COOKIE = 'admin_flash';

/** The admin panel's database client. */
export function adminDb(event: Pick<RequestEvent, 'platform'>): AdminDb {
	return getDb(event.platform);
}

/**
 * To call after every successful change: clears the cached menu pages and leaves a message for
 * the next page view (it survives the redirect after creating or deleting a dish).
 */
export async function changed(event: RequestEvent, message: Flash['message'] = 'saved') {
	const purge = await purgeMenu(event.platform?.env, event.url.origin);
	const flash: Flash = { message, purge };
	event.cookies.set(FLASH_COOKIE, JSON.stringify(flash), {
		path: '/admin',
		httpOnly: true,
		sameSite: 'strict',
		maxAge: 60
	});
}

/** Reads and clears the message left by `changed`. */
export function takeFlash(cookies: Cookies): Flash | null {
	const raw = cookies.get(FLASH_COOKIE);
	if (!raw) return null;
	cookies.delete(FLASH_COOKIE, { path: '/admin' });
	try {
		const flash = JSON.parse(raw) as Flash;
		return flash.message === 'saved' || flash.message === 'deleted' ? flash : null;
	} catch {
		return null;
	}
}

/** `direction` field of the reorder buttons. */
export function parseDirection(value: FormDataEntryValue | null): -1 | 1 | null {
	return value === 'up' ? -1 : value === 'down' ? 1 : null;
}
