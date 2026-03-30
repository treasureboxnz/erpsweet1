ALTER TABLE `products` MODIFY COLUMN `name` varchar(200) DEFAULT '';--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `costPrice` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `sellingPrice` decimal(10,2) DEFAULT '0';