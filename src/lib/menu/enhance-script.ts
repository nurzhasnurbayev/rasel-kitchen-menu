import basket from './basket-ui.ts?inline-script';
import enhance from './enhance.js?inline-script';

/**
 * enhance.js and basket-ui.ts, bundled and minified at build time (see the inline-script plugin in
 * vite.config.ts) and wrapped in one script tag; rendered with {@html} at the end of the menu page.
 * Kept out of the .svelte file because Vite's dependency scanner would mistake the tag for
 * component code.
 */
export const enhanceScriptTag = `<script>${enhance}${basket}</script>`;
