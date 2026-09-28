CREATE TABLE `provider_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`started_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `provider_calls_started` ON `provider_calls` (`started_at`);--> statement-breakpoint
CREATE TABLE `provider_control` (
	`id` integer PRIMARY KEY NOT NULL,
	`cooldown_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `provider_jobs` (
	`key` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`lease_until` integer NOT NULL,
	`retry_until` integer DEFAULT 0 NOT NULL,
	`failures` integer DEFAULT 0 NOT NULL
);
