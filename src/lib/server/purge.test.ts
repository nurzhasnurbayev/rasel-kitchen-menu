import { describe, expect, it, vi } from 'vitest';
import { purgeMenu } from './purge';

const env = { CLOUDFLARE_API_TOKEN: 'token', CLOUDFLARE_ZONE_ID: 'zone1' };
const ok = async () => Response.json({ success: true, errors: [], result: { id: 'zone1' } });

describe('purgeMenu', () => {
	it('purges both menu pages of the current domain', async () => {
		const fetchFn = vi.fn(async (..._args: Parameters<typeof fetch>) => ok());
		await expect(purgeMenu(env, 'https://menu.example.kz', fetchFn)).resolves.toBe('purged');

		expect(fetchFn).toHaveBeenCalledOnce();
		const [url, init] = fetchFn.mock.calls[0];
		expect(url).toBe('https://api.cloudflare.com/client/v4/zones/zone1/purge_cache');
		expect(init?.method).toBe('POST');
		expect(new Headers(init?.headers).get('authorization')).toBe('Bearer token');
		expect(JSON.parse(String(init?.body))).toEqual({
			files: ['https://menu.example.kz/kk', 'https://menu.example.kz/ru']
		});
	});

	it('skips hosts without an edge cache', async () => {
		const fetchFn = vi.fn(ok);
		await expect(purgeMenu(env, 'http://localhost:5173', fetchFn)).resolves.toBe('skipped');
		await expect(purgeMenu(env, 'https://menu.someone.workers.dev', fetchFn)).resolves.toBe(
			'skipped'
		);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('reports missing secrets', async () => {
		const fetchFn = vi.fn(ok);
		await expect(purgeMenu({}, 'https://menu.example.kz', fetchFn)).resolves.toBe('not-configured');
		await expect(
			purgeMenu({ CLOUDFLARE_API_TOKEN: ' ' }, 'https://menu.example.kz', fetchFn)
		).resolves.toBe('not-configured');
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('reports API errors and network failures without throwing', async () => {
		const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
		const denied = async () =>
			Response.json({ success: false, errors: [{ code: 10000 }] }, { status: 403 });
		await expect(purgeMenu(env, 'https://menu.example.kz', denied)).resolves.toBe('failed');
		const offline = async () => {
			throw new TypeError('network down');
		};
		await expect(purgeMenu(env, 'https://menu.example.kz', offline)).resolves.toBe('failed');
		quiet.mockRestore();
	});
});
