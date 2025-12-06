CREATE TABLE `ai_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`eventType` text NOT NULL,
	`userMessage` text NOT NULL,
	`aiMessage` text NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `one_on_ones` (
	`id` text PRIMARY KEY NOT NULL,
	`personId` text NOT NULL,
	`content` text NOT NULL,
	`isCompleted` integer NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`userInput` text NOT NULL,
	`aiOutput` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`category` text NOT NULL,
	`createdAt` text NOT NULL
);
