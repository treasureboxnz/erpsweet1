CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int NOT NULL,
	`userId` int NOT NULL,
	`templateName` varchar(200),
	`selectedProducts` json NOT NULL,
	`displayConfig` json NOT NULL,
	`customContent` text,
	`generatedHtml` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `email_templates` ADD CONSTRAINT `email_templates_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_templates` ADD CONSTRAINT `email_templates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `email_templates_erp_company_idx` ON `email_templates` (`erpCompanyId`);--> statement-breakpoint
CREATE INDEX `email_templates_user_idx` ON `email_templates` (`userId`);--> statement-breakpoint
CREATE INDEX `email_templates_created_at_idx` ON `email_templates` (`createdAt`);