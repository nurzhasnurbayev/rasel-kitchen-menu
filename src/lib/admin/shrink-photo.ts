/**
 * Shrinks a photo in the browser before upload: at most 800 px on the long side, WebP (or JPEG
 * where the browser cannot encode WebP, e.g. older Safari). Phone photos of 3–8 MB become roughly
 * 50–150 KB, which matters on mobile data, for guests and for the admin uploading from a phone.
 *
 * Returns the original file if it cannot be decoded here; the server validates it either way.
 */
const MAX_SIDE = 800;

export async function shrinkPhoto(file: File): Promise<File> {
	let bitmap: ImageBitmap;
	try {
		// Applies the EXIF orientation, so portrait phone photos stay upright.
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		return file;
	}

	const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
	const width = Math.round(bitmap.width * scale);
	const height = Math.round(bitmap.height * scale);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d');
	if (!context) return file;
	context.imageSmoothingQuality = 'high';
	context.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();

	const encode = (type: string, quality: number) =>
		new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

	let blob = await encode('image/webp', 0.82);
	// Browsers that cannot write WebP silently return PNG instead.
	if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg', 0.85);
	if (!blob || blob.size >= file.size) return file;

	const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
	return new File([blob], `photo.${extension}`, { type: blob.type });
}
