CREATE TABLE `cafe_info` (
	`id` integer PRIMARY KEY NOT NULL,
	`address_kk` text,
	`address_ru` text,
	`hours_kk` text,
	`hours_ru` text,
	`phone` text,
	`two_gis_url` text,
	CONSTRAINT "cafe_info_single_row" CHECK(id = 1),
	CONSTRAINT "cafe_info_address_both_or_none" CHECK((address_kk IS NULL) = (address_ru IS NULL)),
	CONSTRAINT "cafe_info_hours_both_or_none" CHECK((hours_kk IS NULL) = (hours_ru IS NULL))
);
