CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`department` text NOT NULL,
	`role` text NOT NULL,
	`manager` text,
	`start_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`capacity_percent` integer DEFAULT 100 NOT NULL,
	`kpi_target` integer DEFAULT 85 NOT NULL,
	`is_demo` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_email_key` ON `employees` (`email`);--> statement-breakpoint
INSERT INTO `employees` (`full_name`, `department`, `role`, `manager`, `status`, `capacity_percent`, `kpi_target`, `is_demo`) VALUES
	('Minh Anh', 'Content', 'Content Creator', 'Đức Anh', 'active', 96, 85, 1),
	('Tuấn Nam', 'Video', 'Video Editor', 'Đức Anh', 'active', 118, 85, 1),
	('Thu Hà', 'Design', 'Graphic Designer', 'Đức Anh', 'active', 88, 85, 1),
	('Quang Huy', 'Ads/Performance', 'Performance Executive', 'Đức Anh', 'active', 112, 85, 1),
	('Lan Phương', 'Account', 'Account Executive', 'Đức Anh', 'active', 74, 85, 1),
	('Hải Yến', 'Content', 'Content Creator', 'Minh Anh', 'on_leave', 0, 80, 1);
