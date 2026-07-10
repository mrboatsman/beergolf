CREATE TABLE `tournament_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text NOT NULL,
	`round` integer NOT NULL,
	`slot` integer NOT NULL,
	`participant1_id` text,
	`participant2_id` text,
	`winner_id` text,
	`coaster_id` text,
	`decided_at` integer,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant1_id`) REFERENCES `tournament_participants`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`participant2_id`) REFERENCES `tournament_participants`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`winner_id`) REFERENCES `tournament_participants`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`coaster_id`) REFERENCES `coasters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_match_slot_unique` ON `tournament_matches` (`tournament_id`,`round`,`slot`);--> statement-breakpoint
DROP INDEX `coaster_player_participant_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `coaster_player_participant_unique` ON `coaster_players` (`coaster_id`,`participant_id`);--> statement-breakpoint
ALTER TABLE `tournaments` ADD `format` text DEFAULT 'stroke' NOT NULL;