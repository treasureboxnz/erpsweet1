ALTER TABLE `order_tracking` ADD `shippingPort` varchar(200);--> statement-breakpoint
ALTER TABLE `order_tracking` ADD `containerNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `order_tracking` ADD `billOfLadingNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `defaultShippingPort` varchar(200);