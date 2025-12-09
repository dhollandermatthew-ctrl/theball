CREATE TABLE `one_on_one_people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`avatarColor` text NOT NULL,
	`sortOrder` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `title` text DEFAULT 'New Task' NOT NULL;