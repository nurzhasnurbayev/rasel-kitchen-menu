/**
 * Test helpers: the real migrations (schema + menu seed) applied to an in-memory SQLite database
 * (D1 is SQLite), optionally wrapped in Drizzle. Only imported by *.test.ts files.
 */
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';

const migrations = import.meta.glob<string>('/drizzle/migrations/*.sql', {
	query: '?raw',
	import: 'default',
	eager: true
});

export function migratedSqlite() {
	const db = new DatabaseSync(':memory:');
	db.exec('PRAGMA foreign_keys = ON'); // D1 always enforces foreign keys
	for (const file of Object.keys(migrations).sort()) db.exec(migrations[file]);
	return db;
}

type Method = 'run' | 'all' | 'values' | 'get';

/**
 * A Drizzle client over a migrated in-memory database. Like D1, `batch` runs its statements in one
 * transaction: if one fails, none of them is applied.
 */
export function migratedDrizzle() {
	const sqlite = migratedSqlite();

	const execute = (sql: string, params: unknown[], method: Method) => {
		const statement = sqlite.prepare(sql);
		if (method === 'run') {
			statement.run(...params);
			return { rows: [] };
		}
		statement.setReturnArrays(true);
		if (method === 'get') return { rows: statement.get(...params) as unknown as unknown[] };
		return { rows: statement.all(...params) as unknown as unknown[] };
	};

	const db = drizzle(
		async (sql, params, method) => execute(sql, params, method),
		async (queries) => {
			sqlite.exec('BEGIN');
			try {
				const results = queries.map((q) => execute(q.sql, q.params, q.method));
				sqlite.exec('COMMIT');
				return results;
			} catch (error) {
				sqlite.exec('ROLLBACK');
				throw error;
			}
		},
		{ schema }
	);
	return { db, sqlite };
}
