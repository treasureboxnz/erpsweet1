ALTER TABLE `cost_snapshots` ADD `rmbLevel1` decimal(10,2);--> statement-breakpoint
ALTER TABLE `cost_snapshots` ADD `rmbLevel2` decimal(10,2);--> statement-breakpoint
ALTER TABLE `cost_snapshots` ADD `rmbLevel3` decimal(10,2);--> statement-breakpoint
ALTER TABLE `cost_snapshots` ADD `rmbTaxRate` decimal(5,2);--> statement-breakpoint
ALTER TABLE `products` ADD `rmbLevel1` decimal(10,2);--> statement-breakpoint
ALTER TABLE `products` ADD `rmbLevel2` decimal(10,2);--> statement-breakpoint
ALTER TABLE `products` ADD `rmbLevel3` decimal(10,2);--> statement-breakpoint
ALTER TABLE `products` ADD `rmbTaxRate` decimal(5,2) DEFAULT '13';