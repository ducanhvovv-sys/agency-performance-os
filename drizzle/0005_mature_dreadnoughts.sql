CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`entity` text,
	`entity_id` text,
	`detail` text,
	`actor` text DEFAULT 'Đức Anh' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kpi_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`month` text NOT NULL,
	`bonus_pool` integer DEFAULT 0 NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`locked_at` text,
	`locked_by` text,
	`detail_snapshot` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kpi_periods_month_key` ON `kpi_periods` (`month`);--> statement-breakpoint
CREATE TABLE `task_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`assignee` text,
	`reviewer` text DEFAULT 'Đức Anh' NOT NULL,
	`quality_score` integer NOT NULL,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
