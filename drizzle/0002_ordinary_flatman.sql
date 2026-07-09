CREATE TABLE `coaster_players` (
	`id` text PRIMARY KEY NOT NULL,
	`coaster_id` text NOT NULL,
	`member_id` text NOT NULL,
	`position` integer NOT NULL,
	`scores` text NOT NULL,
	`signed_at` integer,
	`round_id` text,
	FOREIGN KEY (`coaster_id`) REFERENCES `coasters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coaster_player_unique` ON `coaster_players` (`coaster_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `coasters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`par` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
