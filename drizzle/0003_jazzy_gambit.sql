CREATE TABLE `alert_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`ticker` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `alert_state` (
	`user_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	`last_fired` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `rule_id`)
);
