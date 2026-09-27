CREATE TABLE `market_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`ticker` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text,
	`expires` integer DEFAULT 0 NOT NULL,
	`attempted_at` text,
	`succeeded_at` text,
	`error_code` text,
	`error_message` text
);
