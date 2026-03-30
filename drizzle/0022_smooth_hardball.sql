CREATE TABLE `cost_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`productId` int NOT NULL,
	`factoryPriceRmbExcludingTax` decimal(10,2),
	`factoryPriceRmbIncludingTax` decimal(10,2),
	`factoryPriceUsdFob` decimal(10,2),
	`myCostRmb` decimal(10,2),
	`myCostUsd` decimal(10,2),
	`fobFeeRmb` decimal(10,2),
	`sellingPriceRmbIncludingTax` decimal(10,2),
	`fobLevel1` decimal(10,2),
	`fobLevel2` decimal(10,2),
	`fobLevel3` decimal(10,2),
	`exchangeRate` decimal(10,4) NOT NULL,
	`note` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cost_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `company_settings` ADD `exchangeRateUsdCny` decimal(10,4) DEFAULT '7.2000';--> statement-breakpoint
ALTER TABLE `company_settings` ADD `exchangeRateEurCny` decimal(10,4);--> statement-breakpoint
ALTER TABLE `company_settings` ADD `exchangeRateGbpCny` decimal(10,4);--> statement-breakpoint
ALTER TABLE `cost_snapshots` ADD CONSTRAINT `cost_snapshots_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cost_snapshots` ADD CONSTRAINT `cost_snapshots_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cost_snapshots` ADD CONSTRAINT `cost_snapshots_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cost_snapshots_product_idx` ON `cost_snapshots` (`productId`);--> statement-breakpoint
CREATE INDEX `cost_snapshots_erp_company_idx` ON `cost_snapshots` (`erpCompanyId`);