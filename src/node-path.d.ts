// Minimal typing for Node's `node:path`, used only by vite.config.ts.
// (@types/node is deliberately not installed; see src/lib/server/db/node-sqlite.d.ts.)
declare module 'node:path' {
	export function resolve(...paths: string[]): string;
}
