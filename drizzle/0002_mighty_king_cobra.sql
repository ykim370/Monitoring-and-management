CREATE TABLE `user_records` (
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`revision` integer NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `kind`, `id`)
);
