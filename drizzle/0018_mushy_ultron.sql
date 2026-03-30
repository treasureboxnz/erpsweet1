ALTER TABLE `apollo_candidates` ADD `phone` varchar(50);--> statement-breakpoint
ALTER TABLE `apollo_candidates` ADD `enrichedAt` timestamp;--> statement-breakpoint
ALTER TABLE `apollo_candidates` ADD `companyPhone` varchar(50);--> statement-breakpoint
ALTER TABLE `apollo_candidates` ADD `companyAddress` text;--> statement-breakpoint
ALTER TABLE `apollo_candidates` ADD `companyDescription` text;--> statement-breakpoint
ALTER TABLE `apollo_candidates` ADD `companyFoundedYear` int;--> statement-breakpoint
ALTER TABLE `apollo_candidates` ADD `companyLogoUrl` text;--> statement-breakpoint
ALTER TABLE `apollo_candidates` ADD `companyState` varchar(100);--> statement-breakpoint
ALTER TABLE `apollo_candidates` ADD `companyPostalCode` varchar(20);--> statement-breakpoint
ALTER TABLE `companies` ADD `linkedinUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `companies` ADD `phone` varchar(50);--> statement-breakpoint
ALTER TABLE `companies` ADD `annualRevenue` varchar(50);--> statement-breakpoint
ALTER TABLE `companies` ADD `description` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `foundedYear` int;