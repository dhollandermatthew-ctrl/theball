CREATE TABLE `ai_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`eventType` text NOT NULL,
	`userMessage` text NOT NULL,
	`aiMessage` text NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`color` text NOT NULL,
	`progress` integer NOT NULL,
	`startDate` text NOT NULL,
	`endDate` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `health_bloodwork` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`labName` text,
	`sourceType` text NOT NULL,
	`sourceFileName` text,
	`labValues` text NOT NULL,
	`aiAnalysis` text,
	`aiFlags` text,
	`notes` text,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `health_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`dateOfBirth` text,
	`sex` text,
	`weight` integer,
	`height` integer,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `health_workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`distance` integer,
	`duration` integer,
	`pace` text,
	`calories` integer,
	`sourceType` text NOT NULL,
	`sourceFileName` text,
	`notes` text,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meeting_records` (
	`id` text PRIMARY KEY NOT NULL,
	`spaceId` text NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`transcript` text NOT NULL,
	`notes` text,
	`meetingType` text,
	`insight` text,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meeting_spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`color` text NOT NULL,
	`sortOrder` integer,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `one_on_one_people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`avatarColor` text NOT NULL,
	`sortOrder` integer NOT NULL
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
CREATE TABLE `product_knowledge` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`content` text,
	`fileData` text,
	`fileName` text,
	`fileType` text,
	`fileSize` integer,
	`tags` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`userInput` text NOT NULL,
	`aiOutput` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `space_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`spaceId` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT 'New Task' NOT NULL,
	`content` text NOT NULL,
	`date` text,
	`taskType` text,
	`conversationWith` text,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`category` text NOT NULL,
	`starredDate` text,
	`createdAt` text NOT NULL
);
