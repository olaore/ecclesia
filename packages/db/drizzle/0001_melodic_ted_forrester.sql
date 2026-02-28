CREATE TABLE `attendance_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`event_date` integer NOT NULL,
	`headcount` integer NOT NULL,
	`adults_count` integer,
	`children_count` integer,
	`notes` text,
	`recorded_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
