CREATE TABLE `inspection_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int NOT NULL,
	`inspectionId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`sortOrder` int NOT NULL DEFAULT 0,
	`uploadedBy` int,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inspection_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int NOT NULL,
	`orderId` int NOT NULL,
	`inspectionMethods` json,
	`inspectionDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspections_id` PRIMARY KEY(`id`),
	CONSTRAINT `inspections_orderId_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `customStatus` varchar(100);--> statement-breakpoint
ALTER TABLE `inspection_files` ADD CONSTRAINT `inspection_files_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspection_files` ADD CONSTRAINT `inspection_files_inspectionId_inspections_id_fk` FOREIGN KEY (`inspectionId`) REFERENCES `inspections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspection_files` ADD CONSTRAINT `inspection_files_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `inspection_files_erp_company_idx` ON `inspection_files` (`erpCompanyId`);--> statement-breakpoint
CREATE INDEX `inspection_files_inspection_idx` ON `inspection_files` (`inspectionId`);--> statement-breakpoint
CREATE INDEX `inspections_erp_company_idx` ON `inspections` (`erpCompanyId`);--> statement-breakpoint
CREATE INDEX `inspections_order_idx` ON `inspections` (`orderId`);