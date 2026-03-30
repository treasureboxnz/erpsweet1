CREATE TABLE `apollo_candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int NOT NULL,
	`searchScene` enum('buyer_search','competitor_mining') NOT NULL DEFAULT 'buyer_search',
	`apolloPersonId` varchar(100),
	`apolloOrgId` varchar(100),
	`firstName` varchar(100),
	`lastName` varchar(100),
	`fullName` varchar(200),
	`jobTitle` varchar(200),
	`email` varchar(320),
	`linkedinUrl` varchar(500),
	`companyName` varchar(300),
	`companyDomain` varchar(200),
	`companyLinkedinUrl` varchar(500),
	`industry` varchar(200),
	`country` varchar(100),
	`city` varchar(100),
	`employeeCount` int,
	`annualRevenue` varchar(50),
	`aiOutreachEmail` text,
	`aiGeneratedAt` timestamp,
	`importStatus` enum('pending','imported','skipped','duplicate') NOT NULL DEFAULT 'pending',
	`importedCompanyId` int,
	`importedContactId` int,
	`importedAt` timestamp,
	`importedBy` int,
	`searchBatchId` varchar(100) NOT NULL,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apollo_candidates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `apollo_candidates` ADD CONSTRAINT `apollo_candidates_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `apollo_candidates` ADD CONSTRAINT `apollo_candidates_importedBy_users_id_fk` FOREIGN KEY (`importedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `apollo_candidates` ADD CONSTRAINT `apollo_candidates_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `apollo_candidates_erp_idx` ON `apollo_candidates` (`erpCompanyId`);--> statement-breakpoint
CREATE INDEX `apollo_candidates_status_idx` ON `apollo_candidates` (`importStatus`);--> statement-breakpoint
CREATE INDEX `apollo_candidates_batch_idx` ON `apollo_candidates` (`searchBatchId`);--> statement-breakpoint
CREATE INDEX `apollo_candidates_person_idx` ON `apollo_candidates` (`apolloPersonId`);