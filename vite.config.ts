import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { transform } from 'esbuild';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [inlineScript(), tailwindcss(), sveltekit()],
	test: {
		include: ['src/**/*.test.ts']
	}
});

/**
 * `import code from './file.js?inline-script'` gives the file's source, minified, as a string.
 * Used for the menu's progressive-enhancement script, which is inlined into every menu page
 * (see src/lib/menu/enhance-script.ts), so comments and indentation are not sent to guests.
 */
function inlineScript(): Plugin {
	const query = '?inline-script';
	return {
		name: 'inline-script',
		enforce: 'pre',
		async transform(source, id) {
			if (!id.endsWith(query)) return;
			const { code } = await transform(source, { loader: 'js', minify: true, target: 'es2020' });
			return { code: `export default ${JSON.stringify(code.trim())};`, map: null };
		}
	};
}
