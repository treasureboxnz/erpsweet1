CREATE TABLE `order_finance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int NOT NULL,
	`orderId` int NOT NULL,
	`customerAdvancePaymentDate` timestamp,
	`customerAdvancePaymentAmount` decimal(12,2),
	`customerFinalPaymentDate` timestamp,
	`customerFinalPaymentAmount` decimal(12,2),
	`supplierAdvancePaymentDate` timestamp,
	`supplierAdvancePaymentAmount` decimal(12,2),
	`supplierFinalPaymentDate` timestamp,
	`supplierFinalPaymentAmount` decimal(12,2),
	`paymentMethod` enum('30TT_70TT','LC_AT_SIGHT'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_finance_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_finance_orderId_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE `order_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int NOT NULL,
	`orderId` int NOT NULL,
	`inspectionDate` timestamp,
	`inspectionReportUrl` text,
	`inspectionReportFilename` varchar(255),
	`estimatedShippingDate` timestamp,
	`actualShippingDate` timestamp,
	`etd` timestamp,
	`eta` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_tracking_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_tracking_orderId_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
ALTER TABLE `order_finance` ADD CONSTRAINT `order_finance_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_finance` ADD CONSTRAINT `order_finance_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_tracking` ADD CONSTRAINT `order_tracking_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_tracking` ADD CONSTRAINT `order_tracking_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `order_finance_erp_company_idx` ON `order_finance` (`erpCompanyId`);--> statement-breakpoint
CREATE INDEX `order_finance_order_idx` ON `order_finance` (`orderId`);--> statement-breakpoint
CREATE INDEX `order_tracking_erp_company_idx` ON `order_tracking` (`erpCompanyId`);--> statement-breakpoint
CREATE INDEX `order_tracking_order_idx` ON `order_tracking` (`orderId`);