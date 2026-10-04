/**
 * Cloudflare Access: verifies the JWT that Access adds to every request it lets through
 * (`Cf-Access-Jwt-Assertion` header), as Cloudflare recommends. The Access policy alone is not
 * enough: the Worker is also reachable on routes Access does not cover (workers.dev, other paths),
 * so /admin only trusts a token signed by the team's keys for this application's AUD.
 *
 * https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 *
 * Uses WebCrypto only (available in Workers and Node), no JWT library.
 */

export const ACCESS_JWT_HEADER = 'cf-access-jwt-assertion';

export interface AccessConfig {
	/** Team domain, e.g. "rasel.cloudflareaccess.com" (with or without https://). */
	teamDomain: string;
	/** The Access application's Application Audience (AUD) tag. */
	aud: string;
}

export interface AccessIdentity {
	email: string;
}

export class AccessError extends Error {}

interface Jwk extends JsonWebKey {
	kid?: string;
}

type FetchKeys = (certsUrl: string) => Promise<Jwk[]>;

/** Clock skew tolerated for exp / nbf / iat, in seconds. */
const LEEWAY = 60;
/** How long fetched signing keys are reused (Access rotates them every few weeks). */
const KEYS_TTL_MS = 60 * 60 * 1000;

const keyCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();

const defaultFetchKeys: FetchKeys = async (certsUrl) => {
	const response = await fetch(certsUrl);
	if (!response.ok) throw new AccessError(`Fetching Access keys failed: ${response.status}`);
	const body = (await response.json()) as { keys?: Jwk[] };
	return body.keys ?? [];
};

/** "https://Rasel.cloudflareaccess.com/" → "https://rasel.cloudflareaccess.com" */
export function issuerFor(teamDomain: string): string {
	const host = teamDomain
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/+$/, '')
		.toLowerCase();
	return `https://${host}`;
}

/**
 * Verifies an Access JWT and returns who it belongs to. Throws AccessError for anything that is
 * not a valid, current token for this application.
 */
export async function verifyAccessJwt(
	token: string,
	config: AccessConfig,
	options: { now?: number; fetchKeys?: FetchKeys } = {}
): Promise<AccessIdentity> {
	const now = Math.floor((options.now ?? Date.now()) / 1000);
	const fetchKeys = options.fetchKeys ?? defaultFetchKeys;
	const issuer = issuerFor(config.teamDomain);

	const parts = token.split('.');
	if (parts.length !== 3) throw new AccessError('Malformed token');
	const [headerPart, payloadPart, signaturePart] = parts;

	const header = decodeJson(headerPart) as { alg?: string; kid?: string };
	// Only RS256: never let the token pick a weaker or "none" algorithm.
	if (header.alg !== 'RS256') throw new AccessError('Unexpected algorithm');

	const jwk = await findKey(issuer, header.kid, fetchKeys);
	const key = await crypto.subtle.importKey(
		'jwk',
		{ kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['verify']
	);
	const valid = await crypto.subtle.verify(
		'RSASSA-PKCS1-v1_5',
		key,
		base64UrlDecode(signaturePart),
		new TextEncoder().encode(`${headerPart}.${payloadPart}`)
	);
	if (!valid) throw new AccessError('Bad signature');

	const payload = decodeJson(payloadPart) as {
		iss?: unknown;
		aud?: unknown;
		exp?: unknown;
		nbf?: unknown;
		iat?: unknown;
		email?: unknown;
	};
	if (payload.iss !== issuer) throw new AccessError('Wrong issuer');
	const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
	if (!audiences.includes(config.aud.trim())) throw new AccessError('Wrong audience');
	if (typeof payload.exp !== 'number' || payload.exp + LEEWAY < now) {
		throw new AccessError('Expired');
	}
	for (const claim of [payload.nbf, payload.iat]) {
		if (typeof claim === 'number' && claim - LEEWAY > now) throw new AccessError('Not valid yet');
	}

	// Service tokens have no email; the admin panel is for people.
	if (typeof payload.email !== 'string' || !payload.email) throw new AccessError('No email');
	return { email: payload.email };
}

async function findKey(issuer: string, kid: string | undefined, fetchKeys: FetchKeys) {
	if (!kid) throw new AccessError('Token has no key id');
	const certsUrl = `${issuer}/cdn-cgi/access/certs`;
	const cached = keyCache.get(certsUrl);
	const fresh = cached && Date.now() - cached.fetchedAt < KEYS_TTL_MS;

	let key = fresh ? cached.keys.find((k) => k.kid === kid) : undefined;
	if (!key) {
		// Unknown key id: the keys may have rotated since they were cached.
		const keys = await fetchKeys(certsUrl);
		keyCache.set(certsUrl, { keys, fetchedAt: Date.now() });
		key = keys.find((k) => k.kid === kid);
	}
	if (!key || key.kty !== 'RSA') throw new AccessError('Unknown signing key');
	return key;
}

/** Forgets cached signing keys (for tests). */
export function clearAccessKeyCache() {
	keyCache.clear();
}

function decodeJson(part: string): unknown {
	try {
		return JSON.parse(new TextDecoder().decode(base64UrlDecode(part)));
	} catch {
		throw new AccessError('Malformed token');
	}
}

function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> {
	if (!/^[A-Za-z0-9_-]*$/.test(input)) throw new AccessError('Malformed token');
	const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}
