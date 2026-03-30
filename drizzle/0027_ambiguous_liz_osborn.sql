ALTER TABLE `company_settings` ADD `defaultProfitMarginLevel1` decimal(5,2) DEFAULT '30.00';--> statement-breakpoint
ALTER TABLE `company_settings` ADD `defaultProfitMarginLevel2` decimal(5,2) DEFAULT '25.00';--> statement-breakpoint
ALTER TABLE `company_settings` ADD `defaultProfitMarginLevel3` decimal(5,2) DEFAULT '20.00';--> statement-breakpoint
ALTER TABLE `company_settings` ADD `defaultRmbProfitMargin` decimal(5,2) DEFAULT '15.00';--> statement-breakpoint
ALTER TABLE `company_settings` ADD `defaultTaxRate` decimal(5,2) DEFAULT '13.00';