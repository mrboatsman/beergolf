CREATE TABLE `certifications` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`fadder_id` text,
	`theory_passed` integer DEFAULT false NOT NULL,
	`theory_score` real,
	`theory_at` integer,
	`practical_passed` integer DEFAULT false NOT NULL,
	`practical_proof_url` text,
	`practical_at` integer,
	`etiquette_passed` integer DEFAULT false NOT NULL,
	`certified_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fadder_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`email` text,
	`role` text DEFAULT 'aspirant' NOT NULL,
	`created_by` text,
	`used_by` text,
	`used_at` integer,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`used_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invites_code_unique` ON `invites` (`code`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`member_number` integer,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`role` text DEFAULT 'aspirant' NOT NULL,
	`status` text DEFAULT 'aspirant' NOT NULL,
	`hcp` real DEFAULT 36 NOT NULL,
	`green_card_issued_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`score` real NOT NULL,
	`passed` integer NOT NULL,
	`answers` text NOT NULL,
	`taken_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`correct_index` integer NOT NULL,
	`category` text DEFAULT 'regler' NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`tournament_id` text,
	`holes` integer DEFAULT 18 NOT NULL,
	`scores` text NOT NULL,
	`gross_total` integer NOT NULL,
	`hcp_before` real NOT NULL,
	`hcp_after` real NOT NULL,
	`net_total` real NOT NULL,
	`played_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`starts_at` integer,
	`holes` integer DEFAULT 18 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
