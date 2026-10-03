import { defineConfig } from 'drizzle-kit';

// Only used to *generate* SQL migrations from the schema (`npm run db:generate`).
// Migrations are applied with wrangler (`npm run db:migrate:local` / `db:migrate:remote`).
export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle/migrations',
	strict: true,
	verbose: true
});
