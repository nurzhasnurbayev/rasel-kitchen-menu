import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		// Force runes mode for the project's own components (libraries decide for themselves).
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Builds a Worker with static assets (configured in wrangler.jsonc).
		// During `vite dev` the adapter emulates the bindings (D1, R2) with wrangler's platform proxy.
		adapter: adapter(),
		// The menu CSS is small: inline it so the first paint does not wait for a stylesheet request.
		inlineStyleThreshold: 64 * 1024
	}
};

export default config;
