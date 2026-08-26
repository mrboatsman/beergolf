CREATE TABLE `coaster_back_images` (
	`id` text PRIMARY KEY NOT NULL,
	`coaster_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`content_type` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`scale` real DEFAULT 1 NOT NULL,
	`rotation` real DEFAULT 0 NOT NULL,
	`z` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`coaster_id`) REFERENCES `coasters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `coasters` DROP COLUMN `back_image_key`;--> statement-breakpoint
ALTER TABLE `coasters` DROP COLUMN `back_image_type`;