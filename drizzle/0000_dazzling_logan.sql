CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor` text NOT NULL,
	`job` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`expires` text,
	`checked` text NOT NULL
);
