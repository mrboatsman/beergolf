ALTER TABLE `members` ADD `avatar_key` text;--> statement-breakpoint
ALTER TABLE `members` ADD `gravatar` integer DEFAULT true NOT NULL;