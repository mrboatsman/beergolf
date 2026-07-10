CREATE TABLE `tournament_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text NOT NULL,
	`description` text NOT NULL,
	`amount_ore` integer NOT NULL,
	`receipt_key` text,
	`receipt_type` text,
	`receipt_name` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_expenses_receipt_key_unique` ON `tournament_expenses` (`receipt_key`);--> statement-breakpoint
CREATE TABLE `tournament_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text NOT NULL,
	`member_id` text,
	`guest_name` text,
	`guest_email` text,
	`guest_token` text,
	`playing_hcp` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_via` text,
	`amount_paid_ore` integer,
	`stripe_session_id` text,
	`stripe_payment_intent_id` text,
	`stripe_fee_ore` integer,
	`paid_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_participants_guest_token_unique` ON `tournament_participants` (`guest_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_member_unique` ON `tournament_participants` (`tournament_id`,`member_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_coaster_players` (
	`id` text PRIMARY KEY NOT NULL,
	`coaster_id` text NOT NULL,
	`member_id` text,
	`participant_id` text,
	`position` integer NOT NULL,
	`scores` text NOT NULL,
	`signed_at` integer,
	`round_id` text,
	FOREIGN KEY (`coaster_id`) REFERENCES `coasters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `tournament_participants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_coaster_players`("id", "coaster_id", "member_id", "participant_id", "position", "scores", "signed_at", "round_id") SELECT "id", "coaster_id", "member_id", NULL, "position", "scores", "signed_at", "round_id" FROM `coaster_players`;--> statement-breakpoint
DROP TABLE `coaster_players`;--> statement-breakpoint
ALTER TABLE `__new_coaster_players` RENAME TO `coaster_players`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `coaster_player_unique` ON `coaster_players` (`coaster_id`,`member_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `coaster_player_participant_unique` ON `coaster_players` (`participant_id`);--> statement-breakpoint
ALTER TABLE `coasters` ADD `tournament_id` text REFERENCES tournaments(id);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `tournaments`;--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`slug` text,
	`visibility` text DEFAULT 'open' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`starts_at` integer,
	`holes` integer DEFAULT 18 NOT NULL,
	`created_by` text NOT NULL,
	`charity_name` text,
	`charity_description` text,
	`charity_url` text,
	`entry_fee_ore` integer DEFAULT 0 NOT NULL,
	`prize_mode` text DEFAULT 'none' NOT NULL,
	`prizes` text DEFAULT '[]' NOT NULL,
	`charity_paid_ore` integer,
	`charity_paid_at` integer,
	`charity_receipt_key` text,
	`charity_receipt_type` text,
	`charity_receipt_name` text,
	`opened_at` integer,
	`finished_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `tournaments_slug_unique` ON `tournaments` (`slug`);