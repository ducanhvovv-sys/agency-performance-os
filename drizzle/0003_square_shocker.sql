CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`client` text,
	`channels` text,
	`deadline` text,
	`owner_id` integer,
	`owner_name` text,
	`contract_type` text DEFAULT 'monthly' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`is_demo` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_name_key` ON `projects` (`name`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `project_id` integer;