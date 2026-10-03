import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [inlineScript(), tailwindcss(), sveltekit()],
	test: {
		include: ['src/**/*.test.ts']
	}
});

/**
 * `import code from './file.ts?inline-script'` gives the file, bundled with its (relative) imports
 * and minified, as a string. Used for the menu's progressive-enhancement scripts, which are inlined
 * into every menu page (see src/lib/menu/enhance-script.ts), so comments, indentation and module
 * boilerplate are not sent to guests.
 */
function inlineScript(): Plugin {
	const query = '?inline-script';
	return {
		name: 'inline-script',
		enforce: 'pre',
		async load(id) {
			if (!id.endsWith(query)) return;
			const result = await build({
				entryPoints: [id.slice(0, -query.length)],
				bundle: true,
				write: false,
				minify: true,
				format: 'iife',
				target: 'es2020',
				legalComments: 'none',
				metafile: true
			});
			// Rebuild in `vite dev` when the script or anything it imports changes.
			for (const input of Object.keys(result.metafile.inputs)) this.addWatchFile(resolve(input));
			return {
				code: `export default ${JSON.stringify(result.outputFiles[0].text.trim())};`,
				map: null
			};
		}
	};
}
