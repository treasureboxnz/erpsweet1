CREATE TABLE `in_app_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int NOT NULL,
	`recipientId` int NOT NULL,
	`senderId` int NOT NULL,
	`senderName` varchar(200) NOT NULL,
	`type` enum('mention','task','system') NOT NULL DEFAULT 'mention',
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`relatedType` varchar(50),
	`relatedId` int,
	`relatedCustomerId` int,
	`relatedCustomerName` varchar(200),
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `in_app_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `in_app_notifications` ADD CONSTRAINT `in_app_notifications_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `in_app_notifications` ADD CONSTRAINT `in_app_notifications_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `in_app_notifications` ADD CONSTRAINT `in_app_notifications_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `in_app_notifications_recipient_idx` ON `in_app_notifications` (`recipientId`);--> statement-breakpoint
CREATE INDEX `in_app_notifications_erp_company_idx` ON `in_app_notifications` (`erpCompanyId`);--> statement-breakpoint
CREATE INDEX `in_app_notifications_is_read_idx` ON `in_app_notifications` (`recipientId`,`isRead`);