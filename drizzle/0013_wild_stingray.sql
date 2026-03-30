ALTER TABLE `customer_follow_ups` ADD `currentStageId` int;--> statement-breakpoint
ALTER TABLE `customer_follow_ups` ADD `nextPlanStageId` int;--> statement-breakpoint
ALTER TABLE `customer_follow_ups` ADD `nextPlanDate` timestamp;--> statement-breakpoint
ALTER TABLE `customer_follow_ups` ADD `quotationFiles` text;--> statement-breakpoint
ALTER TABLE `customer_follow_ups` ADD `quotationDate` timestamp;--> statement-breakpoint
ALTER TABLE `customer_follow_ups` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;