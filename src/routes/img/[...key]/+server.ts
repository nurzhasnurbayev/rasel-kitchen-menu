import type { Headers as CfHeaders } from '@cloudflare/workers-types';
import { isValidPhotoKey } from '$lib/photos';
import type { RequestHandler } from './$types';

/**
 * Serves dish photos from the R2 bucket bound as PHOTOS.
 *
 * Responses are cached for a year as immutable, so a photo must never be overwritten in place:
 * the admin panel has to upload every new photo under a new key (e.g. items/12/<random>.webp)
 * and then update `items.photo_key`.
 */
export const GET: RequestHandler = async ({ params, platform, request }) => {
	const key = params.key;
	if (!isValidPhotoKey(key)) return notFound();

	const bucket = platform?.env.PHOTOS;
	if (!bucket) return new Response('Photo storage is not configured', { status: 503 });

	// The DOM and Workers typings describe the same runtime Headers class differently.
	const cf = (headers: Headers) => headers as unknown as CfHeaders;

	// Passing the request headers lets R2 evaluate If-None-Match / If-Modified-Since.
	const object = await bucket.get(key, { onlyIf: cf(request.headers) });
	if (!object) return notFound();

	const headers = new Headers();
	object.writeHttpMetadata(cf(headers));
	headers.set('etag', object.httpEtag);
	headers.set('cache-control', 'public, max-age=31536000, immutable');

	// An object without a body means the precondition matched: the browser's copy is current.
	if (!('body' in object)) return new Response(null, { status: 304, headers });

	return new Response(object.body as unknown as ReadableStream, { headers });
};

function notFound() {
	return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
}
