// Minimal typing for Node's built-in `node:sqlite`, used only by tests (see test-db.ts).
// (@types/node is deliberately not installed: it would make Node-only globals look available
// in code that runs on Cloudflare Workers.) Delete this file if you add @types/node.
declare module 'node:sqlite' {
	interface StatementSync {
		all(...params: unknown[]): Record<string, unknown>[];
		get(...params: unknown[]): Record<string, unknown> | undefined;
		run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
		/** Rows as arrays instead of objects (Node 22.16+). */
		setReturnArrays(enabled: boolean): void;
	}

	export class DatabaseSync {
		constructor(path: string);
		exec(sql: string): void;
		prepare(sql: string): StatementSync;
		close(): void;
	}
}
