CREATE TABLE `invoice_template_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int NOT NULL,
	`templateType` enum('buyer','internal','factory') NOT NULL,
	`fieldConfig` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoice_template_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoice_template_configs_erpCompanyId_templateType_unique` UNIQUE(`erpCompanyId`,`templateType`)
);
--> statement-breakpoint
CREATE TABLE `invoice_terms_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int NOT NULL,
	`termNumber` int NOT NULL,
	`titleCn` varchar(200) NOT NULL,
	`titleEn` varchar(200) NOT NULL,
	`contentCn` text,
	`contentEn` text,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoice_terms_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoice_terms_templates_erpCompanyId_termNumber_unique` UNIQUE(`erpCompanyId`,`termNumber`)
);
--> statement-breakpoint
CREATE TABLE `supplier_bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`erpCompanyId` int NOT NULL,
	`bankName` varchar(255) NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`accountNumber` varchar(100) NOT NULL,
	`currency` varchar(10) NOT NULL,
	`swiftCode` varchar(50),
	`iban` varchar(50),
	`routingNumber` varchar(50),
	`bankAddress` text,
	`isDefault` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `invoice_template_configs` ADD CONSTRAINT `invoice_template_configs_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_terms_templates` ADD CONSTRAINT `invoice_terms_templates_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_bank_accounts` ADD CONSTRAINT `supplier_bank_accounts_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_bank_accounts` ADD CONSTRAINT `supplier_bank_accounts_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `invoice_template_configs_erp_company_idx` ON `invoice_template_configs` (`erpCompanyId`);--> statement-breakpoint
CREATE INDEX `invoice_terms_templates_erp_company_idx` ON `invoice_terms_templates` (`erpCompanyId`);--> statement-breakpoint
CREATE INDEX `invoice_terms_templates_sort_idx` ON `invoice_terms_templates` (`erpCompanyId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `supplier_bank_accounts_supplier_idx` ON `supplier_bank_accounts` (`supplierId`);--> statement-breakpoint
CREATE INDEX `supplier_bank_accounts_currency_idx` ON `supplier_bank_accounts` (`currency`);--> statement-breakpoint
CREATE INDEX `supplier_bank_accounts_sort_idx` ON `supplier_bank_accounts` (`supplierId`,`sortOrder`);