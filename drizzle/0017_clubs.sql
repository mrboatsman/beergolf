CREATE TABLE `club_members` (
	`id` text PRIMARY KEY NOT NULL,
	`club_id` text NOT NULL,
	`member_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`joined_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `club_member_unique` ON `club_members` (`club_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `clubs` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`archived_at` integer,
	`last_activity_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clubs_slug_unique` ON `clubs` (`slug`);--> statement-breakpoint
INSERT INTO `clubs` (`id`, `slug`, `name`, `description`, `status`, `created_by`) VALUES ('tablers', 'tablers', 'Tablers Beer Golf Society', 'Huvudklubben. Alla med grönt kort är medlemmar här.', 'active', NULL);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_club_settings` (
	`club_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`club_id`, `key`),
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_club_settings`("club_id", "key", "value") SELECT 'tablers', "key", "value" FROM `club_settings`;--> statement-breakpoint
DROP TABLE `club_settings`;--> statement-breakpoint
ALTER TABLE `__new_club_settings` RENAME TO `club_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_season_archives` (
	`club_id` text NOT NULL,
	`label` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`data` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`club_id`, `label`),
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_season_archives`("club_id", "label", "starts_at", "ends_at", "data", "created_at") SELECT 'tablers', "label", "starts_at", "ends_at", "data", "created_at" FROM `season_archives`;--> statement-breakpoint
DROP TABLE `season_archives`;--> statement-breakpoint
ALTER TABLE `__new_season_archives` RENAME TO `season_archives`;--> statement-breakpoint
ALTER TABLE `coasters` ADD `club_id` text DEFAULT 'tablers' NOT NULL;--> statement-breakpoint
ALTER TABLE `invites` ADD `club_id` text DEFAULT 'tablers' NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `home_club_id` text DEFAULT 'tablers' NOT NULL;--> statement-breakpoint
ALTER TABLE `rounds` ADD `club_id` text DEFAULT 'tablers' NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `club_id` text DEFAULT 'tablers' NOT NULL;--> statement-breakpoint
INSERT INTO `club_members` (`id`, `club_id`, `member_id`, `role`, `status`, `joined_at`, `created_at`) SELECT lower(hex(randomblob(16))), 'tablers', `id`, CASE WHEN `role` = 'captain' THEN 'captain' ELSE 'member' END, 'active', `created_at`, `created_at` FROM `members`;--> statement-breakpoint
UPDATE `members` SET `role` = CASE WHEN EXISTS (SELECT 1 FROM `certifications` c WHERE c.`fadder_id` = `members`.`id`) THEN 'fadder' ELSE 'member' END WHERE `role` = 'captain';
