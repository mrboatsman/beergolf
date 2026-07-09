CREATE TABLE `certification_proofs` (
	`id` text PRIMARY KEY NOT NULL,
	`certification_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`certification_id`) REFERENCES `certifications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `certification_proofs_storage_key_unique` ON `certification_proofs` (`storage_key`);--> statement-breakpoint
ALTER TABLE `certifications` DROP COLUMN `practical_proof_url`;