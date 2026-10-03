// Minimal typing for Node's built-in `node:sqlite`, used only by migrations.test.ts.
// (@types/node is deliberately not installed: it would make Node-only globals look available
// in code that runs on Cloudflare Workers.) Delete this file if you add @types/node.
declare module 'node:sqlite' {
	interface StatementSync {
		all(...params: unknown[]): Record<string, unknown>[];
		get(...params: unknown[]): Record<string, unknown> | undefined;
		run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
	}

	export class DatabaseSync {
		constructor(path: string);
		exec(sql: string): void;
		prepare(sql: string): StatementSync;
		close(): void;
	}
}
