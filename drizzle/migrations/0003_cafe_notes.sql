-- Adds guest notes (e.g. "Обслуживание 10%") to cafe_info. SQLite cannot add a CHECK constraint
-- to an existing table, so the table is rebuilt.
-- Edited after `drizzle-kit generate`: the INSERT copies only the columns the old table has (the
-- generated one also selected the new ones, which fails), and the PRAGMA foreign_keys lines are
-- gone: no foreign key involves cafe_info, and D1 enforces foreign keys regardless.
CREATE TABLE `__new_cafe_info` (
	`id` integer PRIMARY KEY NOT NULL,
	`address_kk` text,
	`address_ru` text,
	`hours_kk` text,
	`hours_ru` text,
	`phone` text,
	`two_gis_url` text,
	`notes_kk` text,
	`notes_ru` text,
	CONSTRAINT "cafe_info_single_row" CHECK(id = 1),
	CONSTRAINT "cafe_info_address_both_or_none" CHECK((address_kk IS NULL) = (address_ru IS NULL)),
	CONSTRAINT "cafe_info_hours_both_or_none" CHECK((hours_kk IS NULL) = (hours_ru IS NULL)),
	CONSTRAINT "cafe_info_notes_both_or_none" CHECK((notes_kk IS NULL) = (notes_ru IS NULL))
);
--> statement-breakpoint
INSERT INTO `__new_cafe_info`("id", "address_kk", "address_ru", "hours_kk", "hours_ru", "phone", "two_gis_url") SELECT "id", "address_kk", "address_ru", "hours_kk", "hours_ru", "phone", "two_gis_url" FROM `cafe_info`;--> statement-breakpoint
DROP TABLE `cafe_info`;--> statement-breakpoint
ALTER TABLE `__new_cafe_info` RENAME TO `cafe_info`;
