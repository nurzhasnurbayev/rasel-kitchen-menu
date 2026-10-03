CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name_kk` text NOT NULL,
	`name_ru` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	CONSTRAINT "categories_visible_bool" CHECK(visible IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`name_kk` text NOT NULL,
	`name_ru` text NOT NULL,
	`description_kk` text,
	`description_ru` text,
	`photo_key` text,
	`available` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "items_available_bool" CHECK(available IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `items_category_sort_idx` ON `items` (`category_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`label_kk` text,
	`label_ru` text,
	`price` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "variants_price_non_negative" CHECK(price IS NULL OR price >= 0),
	CONSTRAINT "variants_label_both_or_none" CHECK((label_kk IS NULL) = (label_ru IS NULL))
);
--> statement-breakpoint
CREATE INDEX `variants_item_sort_idx` ON `variants` (`item_id`,`sort_order`);