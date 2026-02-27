CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`admin_id` text NOT NULL,
	`changes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `guests` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`visit_date` integer,
	`status` text DEFAULT 'first_time' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `known_people` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`dob_month` integer,
	`dob_day` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `member_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`admin_id` text NOT NULL,
	`note` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`home_address` text,
	`gender` text,
	`age_group` text,
	`marital_status` text,
	`occupation` text,
	`department` text,
	`dob_month` integer,
	`dob_day` integer,
	`anniversary_month` integer,
	`anniversary_day` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`date_joined` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`unit_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);