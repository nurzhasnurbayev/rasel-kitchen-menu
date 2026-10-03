import source from './enhance.js?inline-script';

/**
 * enhance.js, minified at build time (see the inline-script plugin in vite.config.ts) and wrapped
 * in a script tag; rendered with {@html} at the end of the menu page.
 * Kept out of the .svelte file because Vite's dependency scanner would mistake the tag for
 * component code.
 */
export const enhanceScriptTag = `<script>${source}</script>`;
