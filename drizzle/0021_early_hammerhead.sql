ALTER TABLE `product_category_links` DROP FOREIGN KEY `product_category_links_categoryId_categories_id_fk`;
--> statement-breakpoint
ALTER TABLE `product_category_links` ADD CONSTRAINT `product_category_links_categoryId_product_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `product_categories`(`id`) ON DELETE cascade ON UPDATE no action;