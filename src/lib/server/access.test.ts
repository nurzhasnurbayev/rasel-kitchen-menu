import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clearAccessKeyCache, issuerFor, verifyAccessJwt } from './access';

const config = { teamDomain: 'rasel.cloudflareaccess.com', aud: 'aud-123' };
const ISS = 'https://rasel.cloudflareaccess.com';
const NOW = 1_800_000_000; // seconds

let signingKey: CryptoKey;
let otherKey: CryptoKey;
let publicJwk: JsonWebKey;

const algorithm = {
	name: 'RSASSA-PKCS1-v1_5',
	modulusLength: 2048,
	publicExponent: new Uint8Array([1, 0, 1]),
	hash: 'SHA-256'
};

beforeAll(async () => {
	const pair = (await crypto.subtle.generateKey(algorithm, true, [
		'sign',
		'verify'
	])) as CryptoKeyPair;
	const other = (await crypto.subtle.generateKey(algorithm, true, [
		'sign',
		'verify'
	])) as CryptoKeyPair;
	signingKey = pair.privateKey;
	otherKey = other.privateKey;
	publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
});

beforeEach(() => clearAccessKeyCache());

function b64url(data: string | Uint8Array) {
	const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

async function sign(
	payload: Record<string, unknown>,
	{ key = signingKey, header = { alg: 'RS256', kid: 'k1' } as Record<string, unknown> } = {}
) {
	const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
	const signature = await crypto.subtle.sign(
		'RSASSA-PKCS1-v1_5',
		key,
		new TextEncoder().encode(input)
	);
	return `${input}.${b64url(new Uint8Array(signature))}`;
}

const claims = (overrides: Record<string, unknown> = {}) => ({
	iss: ISS,
	aud: ['aud-123'],
	email: 'owner@example.kz',
	iat: NOW - 10,
	nbf: NOW - 10,
	exp: NOW + 3600,
	...overrides
});

const requested: string[] = [];
const fetchKeys = async (url: string) => {
	requested.push(url);
	return [{ ...publicJwk, kid: 'k1' }];
};
const verify = (token: string) => verifyAccessJwt(token, config, { now: NOW * 1000, fetchKeys });

describe('verifyAccessJwt', () => {
	it('accepts a valid token and returns the email', async () => {
		requested.length = 0;
		await expect(verify(await sign(claims()))).resolves.toEqual({ email: 'owner@example.kz' });
		expect(requested).toEqual([`${ISS}/cdn-cgi/access/certs`]);
		// Keys are cached between requests.
		await verify(await sign(claims()));
		expect(requested).toHaveLength(1);
	});

	it('accepts a string audience', async () => {
		await expect(verify(await sign(claims({ aud: 'aud-123' })))).resolves.toBeTruthy();
	});

	it.each([
		['another application', { aud: ['aud-999'] }, /audience/],
		['another team', { iss: 'https://evil.cloudflareaccess.com' }, /issuer/],
		['expired', { exp: NOW - 120 }, /Expired/],
		['without exp', { exp: undefined }, /Expired/],
		['not valid yet', { nbf: NOW + 600 }, /valid yet/],
		['a service token (no email)', { email: undefined }, /email/]
	])('rejects a token for %s', async (_, overrides, error) => {
		await expect(verify(await sign(claims(overrides)))).rejects.toThrow(error);
	});

	it('rejects a token signed with another key', async () => {
		await expect(verify(await sign(claims(), { key: otherKey }))).rejects.toThrow(/signature/);
	});

	it('rejects a tampered payload', async () => {
		const [header, , signature] = (await sign(claims())).split('.');
		const forged = b64url(JSON.stringify(claims({ email: 'attacker@example.com' })));
		await expect(verify(`${header}.${forged}.${signature}`)).rejects.toThrow(/signature/);
	});

	it('rejects other algorithms, including "none"', async () => {
		const none = await sign(claims(), { header: { alg: 'none', kid: 'k1' } });
		await expect(verify(none)).rejects.toThrow(/algorithm/);
		const hs = await sign(claims(), { header: { alg: 'HS256', kid: 'k1' } });
		await expect(verify(hs)).rejects.toThrow(/algorithm/);
	});

	it('rejects an unknown key id after refreshing the keys', async () => {
		requested.length = 0;
		await verify(await sign(claims()));
		const token = await sign(claims(), { header: { alg: 'RS256', kid: 'rotated' } });
		await expect(verify(token)).rejects.toThrow(/signing key/);
		expect(requested).toHaveLength(2);
	});

	it('rejects garbage', async () => {
		await expect(verify('')).rejects.toThrow(/Malformed/);
		await expect(verify('a.b')).rejects.toThrow(/Malformed/);
		await expect(verify('a.b.c')).rejects.toThrow(/Malformed/);
		await expect(verify('!!.??.##')).rejects.toThrow(/Malformed/);
	});
});

describe('issuerFor', () => {
	it('normalises the team domain', () => {
		expect(issuerFor('rasel.cloudflareaccess.com')).toBe(ISS);
		expect(issuerFor(' https://Rasel.cloudflareaccess.com/ ')).toBe(ISS);
	});
});
