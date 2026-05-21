-- UP
CREATE TABLE `transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`rawTranscript` text NOT NULL DEFAULT '',
	`utterances` text NOT NULL DEFAULT '[]',
	`status` text NOT NULL DEFAULT 'done',
	`createdAt` text NOT NULL
);
