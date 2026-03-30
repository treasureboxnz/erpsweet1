ALTER TABLE `products` MODIFY COLUMN `packageCbm` decimal(10,6);--> statement-breakpoint
ALTER TABLE `products` ADD `volumeUnit` enum('cm','m','mm') DEFAULT 'cm' NOT NULL;