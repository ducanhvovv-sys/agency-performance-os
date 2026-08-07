CREATE TABLE `integrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text DEFAULT 'google_sheets' NOT NULL,
	`name` text NOT NULL,
	`source_url` text NOT NULL,
	`source_file_id` text,
	`source_tab` text DEFAULT '5. CHECKLIST CONTENT' NOT NULL,
	`source_format` text DEFAULT 'xlsm' NOT NULL,
	`status` text DEFAULT 'snapshot_ready' NOT NULL,
	`bridge_url` text,
	`bridge_token` text,
	`rows_imported` integer DEFAULT 0 NOT NULL,
	`last_synced_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integrations_kind_key` ON `integrations` (`kind`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `source_type` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `source_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `source_sheet` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `source_row` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `content_type` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `content_pillar` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `asset_type` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `sheet_status` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `channel_status` text DEFAULT 'not_checked' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `post_url` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `sync_state` text DEFAULT 'app_only' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `last_synced_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_source_key` ON `tasks` (`source_type`,`source_id`);