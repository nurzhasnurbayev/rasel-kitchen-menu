import { describe, expect, it } from 'vitest';
import { canonicalUrl } from './canonical';

const redirectWith = (host: string | undefined, url: string) =>
	canonicalUrl(new URL(url), host)?.href ?? null;
const redirect = (url: string) => redirectWith('rasel-kitchen.app', url);

describe('canonicalUrl', () => {
	it('serves the domain itself as it is', () => {
		expect(redirect('https://rasel-kitchen.app/kk')).toBeNull();
		expect(redirect('https://RASEL-KITCHEN.app/ru')).toBeNull();
		// How `npm run preview` (wrangler dev) presents local requests: redirecting would loop.
		expect(redirect('http://rasel-kitchen.app/kk')).toBeNull();
	});

	it('sends www. and workers.dev visits to the domain, keeping the path and query', () => {
		expect(redirect('https://www.rasel-kitchen.app/ru?x=1')).toBe(
			'https://rasel-kitchen.app/ru?x=1'
		);
		expect(
			redirect('https://rasel-kitchen-menu.rasel-kitchen-menu.workers.dev/admin/items/3')
		).toBe('https://rasel-kitchen.app/admin/items/3');
		expect(redirect('https://abc123-rasel-kitchen-menu.rasel-kitchen-menu.workers.dev/')).toBe(
			'https://rasel-kitchen.app/'
		);
	});

	it('always redirects to HTTPS without a port', () => {
		expect(redirect('http://www.rasel-kitchen.app:8080/')).toBe('https://rasel-kitchen.app/');
	});

	it('never leaves the domain, whatever the path looks like', () => {
		expect(redirect('https://www.rasel-kitchen.app//evil.example/x')).toBe(
			'https://rasel-kitchen.app//evil.example/x'
		);
		expect(redirect('https://www.rasel-kitchen.app/%2F%2Fevil.example')).toBe(
			'https://rasel-kitchen.app/%2F%2Fevil.example'
		);
	});

	it('leaves local development and unknown hosts alone', () => {
		expect(redirect('http://localhost:5173/kk')).toBeNull();
		expect(redirect('http://127.0.0.1:8787/kk')).toBeNull();
		expect(redirect('https://example.com/kk')).toBeNull();
		expect(redirect('https://rasel-kitchen.app.example.com/kk')).toBeNull();
	});

	it('does nothing until a domain is configured', () => {
		const url = 'https://rasel-kitchen-menu.rasel-kitchen-menu.workers.dev/kk';
		expect(redirectWith(undefined, url)).toBeNull();
		expect(redirectWith(' ', url)).toBeNull();
	});
});
