CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`project` text NOT NULL,
	`department` text NOT NULL,
	`assignee` text NOT NULL,
	`due_date` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`weight` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_by` text DEFAULT 'Đức Anh' NOT NULL,
	`blocked_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
