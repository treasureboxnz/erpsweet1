CREATE TABLE `attributes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`name` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`subcategory` varchar(100),
	`fieldName` varchar(100) NOT NULL,
	`displayOrder` int DEFAULT 0,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attributes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`name` varchar(100) NOT NULL,
	`description` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`companyName` varchar(200) NOT NULL,
	`customerCode` varchar(50),
	`customerNature` varchar(100),
	`customerCategory` json,
	`industryType` varchar(100),
	`country` varchar(100),
	`state` varchar(100),
	`city` varchar(100),
	`address` text,
	`postalCode` varchar(20),
	`businessLicense` varchar(100),
	`taxNumber` varchar(100),
	`website` varchar(200),
	`logoUrl` text,
	`companyScale` enum('small','medium','large','enterprise'),
	`mainProducts` text,
	`annualPurchaseVolume` decimal(15,2),
	`cooperationStatus` enum('developing','cooperating','stopped') NOT NULL DEFAULT 'developing',
	`assignedTo` int,
	`source` varchar(100),
	`cooperationLevel` varchar(100),
	`notes` text,
	`defaultFobLevel` enum('level1','level2','level3') NOT NULL DEFAULT 'level1',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `companies_customerCode_unique` UNIQUE(`customerCode`)
);
--> statement-breakpoint
CREATE TABLE `company_assignees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`assignedBy` int,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `company_assignees_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_assignees_companyId_userId_unique` UNIQUE(`companyId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `company_attachment_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`companyId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `company_attachment_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`companyId` int NOT NULL,
	`categoryId` int,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`displayOrder` int NOT NULL DEFAULT 0,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedBy` int,
	`deletedAt` timestamp,
	`uploadedBy` int,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `company_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
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
	CONSTRAINT `company_bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`companyId` int NOT NULL,
	`contactId` int NOT NULL,
	`isPrimary` boolean DEFAULT false,
	`relationshipType` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `company_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_letterheads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`companyNameEn` varchar(255),
	`tradeAs` varchar(255),
	`contactPersonEn` varchar(100),
	`contactPhone` varchar(50),
	`contactEmail` varchar(255),
	`addressEn` text,
	`cityEn` varchar(100),
	`stateEn` varchar(100),
	`postalCode` varchar(20),
	`countryEn` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_letterheads_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_letterheads_companyId_unique` UNIQUE(`companyId`)
);
--> statement-breakpoint
CREATE TABLE `company_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`companyLogo` text,
	`contactPhone` varchar(50),
	`contactEmail` varchar(255),
	`companyAddress` text,
	`postalCode` varchar(20),
	`invoiceCompanyName` varchar(255),
	`taxNumber` varchar(100),
	`brandName` varchar(255),
	`brandSlogan` varchar(500),
	`websiteUrl` varchar(500),
	`defaultCurrency` varchar(10) NOT NULL DEFAULT 'USD',
	`timezone` varchar(100) NOT NULL DEFAULT 'UTC',
	`language` varchar(10) NOT NULL DEFAULT 'zh-CN',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_settings_erpCompanyId_unique` UNIQUE(`erpCompanyId`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`fullName` varchar(100) NOT NULL,
	`firstName` varchar(50),
	`lastName` varchar(50),
	`jobTitle` varchar(100),
	`department` varchar(100),
	`role` enum('decision_maker','purchaser','finance','technical','sales','other'),
	`mobile` varchar(50),
	`phone` varchar(50),
	`email` varchar(320),
	`wechat` varchar(100),
	`skype` varchar(100),
	`linkedin` varchar(200),
	`whatsapp` varchar(50),
	`importance` enum('key','normal','secondary') DEFAULT 'normal',
	`preferredLanguage` varchar(50),
	`bestContactTime` varchar(100),
	`timezone` varchar(50),
	`notes` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_follow_ups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`customerId` int NOT NULL,
	`content` text NOT NULL,
	`followUpType` enum('call','email','meeting','visit','other') NOT NULL,
	`followUpBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_follow_ups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`customerId` int NOT NULL,
	`productId` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`currency` enum('USD','RMB') NOT NULL DEFAULT 'USD',
	`orderId` int,
	`transactionDate` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`companyName` varchar(200) NOT NULL,
	`contactPerson` varchar(100),
	`email` varchar(320),
	`phone` varchar(50),
	`address` text,
	`country` varchar(100),
	`region` varchar(100),
	`tags` text,
	`status` enum('active','inactive','potential') NOT NULL DEFAULT 'potential',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`migratedToCompanyId` int,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyCode` varchar(50) NOT NULL,
	`companyName` varchar(200) NOT NULL,
	`companyNameEn` varchar(200),
	`logo` text,
	`address` text,
	`email` varchar(320),
	`phone` varchar(50),
	`status` enum('active','suspended','deleted') NOT NULL DEFAULT 'active',
	`plan` enum('free','basic','pro','enterprise') NOT NULL DEFAULT 'free',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erp_companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_companies_companyCode_unique` UNIQUE(`companyCode`)
);
--> statement-breakpoint
CREATE TABLE `follow_up_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`companyId` int NOT NULL,
	`contactId` int,
	`type` enum('call','email','meeting','visit','quote','sample','other') NOT NULL,
	`subject` varchar(200),
	`content` text NOT NULL,
	`result` enum('positive','neutral','negative','pending'),
	`nextFollowUpDate` timestamp,
	`attachments` text,
	`relatedOrderId` int,
	`followUpBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `follow_up_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `material_boards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`supplierId` int NOT NULL,
	`categoryId` int,
	`boardNumber` varchar(100) NOT NULL,
	`boardName` varchar(255),
	`materialType` varchar(100),
	`pricePerMeter` decimal(15,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'CNY',
	`minOrderQuantity` int,
	`leadTime` int,
	`description` text,
	`notes` text,
	`imageUrl` varchar(500),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`isLocked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_boards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `material_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`name` varchar(100) NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `material_categories_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `material_colors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`boardId` int NOT NULL,
	`colorCode` varchar(100) NOT NULL,
	`colorName` varchar(255),
	`fullCode` varchar(255),
	`hexColor` varchar(7),
	`imageUrl` text,
	`thumbnailUrl` text,
	`stockQuantity` int,
	`notes` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`isLocked` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_colors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `material_suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`materialTypeId` int,
	`materialTypeName` varchar(100),
	`categoryId` int,
	`name` varchar(255) NOT NULL,
	`code` varchar(100) NOT NULL,
	`contactPerson` varchar(100),
	`contactPhone` varchar(50),
	`contactEmail` varchar(255),
	`address` text,
	`notes` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`isLocked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `material_suppliers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `material_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`name` varchar(50) NOT NULL,
	`icon` varchar(10),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `material_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`fileSize` int NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`title` varchar(255),
	`altText` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_library_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`userId` int NOT NULL,
	`userName` varchar(100) NOT NULL,
	`operationType` enum('create','update','delete','suspend','activate') NOT NULL,
	`module` enum('customer','product','order','user','price') NOT NULL,
	`targetId` int,
	`targetName` varchar(200),
	`details` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`orderId` int NOT NULL,
	`productId` int,
	`variantId` int,
	`supplierSku` varchar(100),
	`customerSku` varchar(100),
	`productName` varchar(200),
	`productSku` varchar(100),
	`sku` varchar(100),
	`orderMode` enum('batch_selection','fob_only') NOT NULL DEFAULT 'batch_selection',
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`discount` decimal(10,2) DEFAULT '0',
	`taxRate` decimal(5,2) DEFAULT '0',
	`subtotal` decimal(12,2) NOT NULL,
	`fobQuantity` int,
	`fobUnitPrice` decimal(10,2),
	`fobTotalPrice` decimal(12,2),
	`grossWeight` decimal(10,3),
	`netWeight` decimal(10,3),
	`cbm` decimal(10,3),
	`piecesPerBox` int DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`orderId` int NOT NULL,
	`fromStatus` varchar(50),
	`toStatus` varchar(50) NOT NULL,
	`notes` text,
	`changedBy` int,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`orderNumber` varchar(100) NOT NULL,
	`customerId` int NOT NULL,
	`customerName` varchar(200),
	`totalAmount` decimal(12,2) NOT NULL,
	`orderMode` enum('fob','batch') NOT NULL DEFAULT 'fob',
	`createdFromQuotationId` int,
	`createdFromQuotationNumber` varchar(50),
	`currency` varchar(10) DEFAULT 'USD',
	`exchangeRate` decimal(10,4),
	`status` enum('pending','confirmed','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`paymentStatus` enum('unpaid','partial','paid','refunded') DEFAULT 'unpaid',
	`paymentMethod` varchar(50),
	`paymentTerms` varchar(200),
	`orderDate` timestamp NOT NULL DEFAULT (now()),
	`expectedDeliveryDate` timestamp,
	`actualDeliveryDate` timestamp,
	`shippingMethod` varchar(100),
	`trackingNumber` varchar(200),
	`shippingAddress` text,
	`billingAddress` text,
	`contactPerson` varchar(100),
	`contactPhone` varchar(50),
	`contactEmail` varchar(320),
	`notes` text,
	`priority` enum('low','normal','high','urgent') DEFAULT 'normal',
	`source` varchar(100),
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	`deletedBy` int,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `package_boxes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int NOT NULL,
	`variantId` int NOT NULL,
	`boxNumber` int NOT NULL,
	`length` decimal(10,2) NOT NULL,
	`width` decimal(10,2) NOT NULL,
	`height` decimal(10,2) NOT NULL,
	`cbm` decimal(10,6) NOT NULL,
	`grossWeight` decimal(10,2) DEFAULT '0',
	`netWeight` decimal(10,2) DEFAULT '0',
	`packagingType` enum('single','multiple','bulk') NOT NULL DEFAULT 'single',
	`piecesPerBox` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `package_boxes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`positionId` int NOT NULL,
	`module` varchar(100) NOT NULL,
	`permissionType` enum('read','write','download','delete','all') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_positionId_module_permissionType_unique` UNIQUE(`positionId`,`module`,`permissionType`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`name` varchar(100) NOT NULL,
	`displayName` varchar(100) NOT NULL,
	`description` text,
	`isSystem` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`),
	CONSTRAINT `positions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`productId` int NOT NULL,
	`fieldName` varchar(100) NOT NULL,
	`fieldLabel` varchar(100) NOT NULL,
	`oldValue` decimal(10,2),
	`newValue` decimal(10,2),
	`changedBy` int,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`batchCode` varchar(100) NOT NULL,
	`productId` int NOT NULL,
	`customerId` int NOT NULL,
	`supplierId` int,
	`customRequirements` text,
	`factoryPriceRmbExcludingTax` decimal(10,2),
	`factoryPriceRmbIncludingTax` decimal(10,2),
	`factoryPriceUsdFob` decimal(10,2),
	`myCostRmb` decimal(10,2),
	`myCostUsd` decimal(10,2),
	`fobFeeRmb` decimal(10,2),
	`sellingPriceRmbIncludingTax` decimal(10,2),
	`fobSellingPrice` decimal(10,2),
	`productionStatus` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_batches_batchCode_unique` UNIQUE(`batchCode`)
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`name` varchar(100) NOT NULL,
	`parentId` int,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_category_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`productId` int NOT NULL,
	`categoryId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_category_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`productId` int NOT NULL,
	`imageUrl` varchar(500) NOT NULL,
	`imageKey` varchar(500) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`productId` int NOT NULL,
	`supplierId` int NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_tag_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`productId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_tag_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`productId` int NOT NULL,
	`variantCode` varchar(50) NOT NULL,
	`variantName` varchar(200) NOT NULL,
	`fabricChange` varchar(200),
	`legTypeChange` varchar(200),
	`heightChange` varchar(200),
	`packagingChange` varchar(200),
	`otherChanges` text,
	`productLength` decimal(10,2),
	`productWidth` decimal(10,2),
	`productHeight` decimal(10,2),
	`packageLength` decimal(10,2),
	`packageWidth` decimal(10,2),
	`packageHeight` decimal(10,2),
	`cbm` decimal(10,6),
	`variantType` enum('universal','exclusive') NOT NULL DEFAULT 'universal',
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`productionStatus` enum('designing','sampling','production','completed') NOT NULL DEFAULT 'designing',
	`isDefault` boolean NOT NULL DEFAULT false,
	`supplierId` int,
	`supplierSku` varchar(100),
	`customerId` int,
	`customerSku` varchar(100),
	`materialColorId` int,
	`sellingPriceRMB` decimal(10,2),
	`sellingPriceFOB` decimal(10,2),
	`costPriceRMB` decimal(10,2),
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_variants_variantCode_unique` UNIQUE(`variantCode`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`name` varchar(200) NOT NULL,
	`sku` varchar(100) NOT NULL,
	`description` text,
	`categoryId` int,
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
	`costPrice` decimal(10,2) NOT NULL,
	`sellingPrice` decimal(10,2) NOT NULL,
	`remainingStock` int DEFAULT 0,
	`unit` varchar(50) NOT NULL DEFAULT 'pcs',
	`productionMode` enum('make_to_order','ready_stock') NOT NULL DEFAULT 'make_to_order',
	`packageLength` decimal(10,3),
	`packageWidth` decimal(10,3),
	`packageHeight` decimal(10,3),
	`packageCbm` decimal(10,3),
	`imageUrl` text,
	`status` enum('active','discontinued','developing') NOT NULL DEFAULT 'active',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `quotation_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`quotationId` int NOT NULL,
	`approverId` int NOT NULL,
	`approverName` varchar(100) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`decision` enum('approved','rejected'),
	`comments` text,
	`decidedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotation_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotation_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`quotationItemId` int NOT NULL,
	`variantId` int,
	`variantCode` varchar(100),
	`variantName` varchar(255),
	`quantity` int NOT NULL,
	`unitPrice` decimal(15,2) NOT NULL,
	`subtotal` decimal(15,2) NOT NULL,
	`grossWeight` decimal(10,3),
	`netWeight` decimal(10,3),
	`cbm` decimal(10,3),
	`piecesPerBox` int DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotation_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotation_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`quotationId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`productSku` varchar(100) NOT NULL,
	`supplierSku` varchar(100),
	`customerSku` varchar(100),
	`fobQuantity` int,
	`fobUnitPrice` decimal(15,2),
	`fobSubtotal` decimal(15,2),
	`grossWeight` decimal(10,6),
	`netWeight` decimal(10,6),
	`cbm` decimal(10,6),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotation_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotation_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`templateName` varchar(255) NOT NULL,
	`description` text,
	`quotationMode` enum('fob_only','batch_selection') NOT NULL DEFAULT 'batch_selection',
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`productsData` json NOT NULL,
	`notes` text,
	`customerNotes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotation_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotation_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`quotationId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`snapshotData` json NOT NULL,
	`changeDescription` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotation_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`quotationNumber` varchar(50) NOT NULL,
	`customerId` int NOT NULL,
	`customerName` varchar(255) NOT NULL,
	`contactPerson` varchar(100),
	`contactPhone` varchar(50),
	`contactEmail` varchar(255),
	`shippingAddress` text,
	`quotationMode` enum('fob_only','batch_selection') NOT NULL DEFAULT 'batch_selection',
	`currency` varchar(10) NOT NULL DEFAULT 'USD',
	`status` enum('draft','sent','accepted','rejected','expired','pending_approval','approval_rejected') NOT NULL DEFAULT 'draft',
	`requiresApproval` boolean NOT NULL DEFAULT false,
	`approvalStatus` enum('pending','approved','rejected'),
	`totalAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`validUntil` timestamp,
	`notes` text,
	`customerNotes` text,
	`version` int NOT NULL DEFAULT 1,
	`parentQuotationId` int,
	`convertedToOrderId` int,
	`convertedAt` timestamp,
	`sentAt` timestamp,
	`sentBy` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `quotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotations_quotationNumber_unique` UNIQUE(`quotationNumber`)
);
--> statement-breakpoint
CREATE TABLE `sku_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int NOT NULL,
	`ruleType` varchar(50) NOT NULL,
	`prefix` varchar(20) NOT NULL DEFAULT '',
	`suffixLength` int NOT NULL DEFAULT 4,
	`currentCounter` int NOT NULL DEFAULT 0,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sku_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`name` varchar(100) NOT NULL,
	`description` text,
	`parentId` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`supplierName` varchar(200) NOT NULL,
	`supplierCode` varchar(50),
	`contactPerson` varchar(100),
	`email` varchar(320),
	`phone` varchar(50),
	`address` text,
	`city` varchar(100),
	`province` varchar(100),
	`country` varchar(100),
	`postalCode` varchar(20),
	`website` varchar(500),
	`logoUrl` text,
	`taxId` varchar(100),
	`businessLicense` varchar(100),
	`categoryId` int,
	`rating` int DEFAULT 0,
	`paymentTerms` varchar(200),
	`currency` varchar(10) DEFAULT 'CNY',
	`notes` text,
	`status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_supplierCode_unique` UNIQUE(`supplierCode`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`name` varchar(50) NOT NULL,
	`color` varchar(20) NOT NULL DEFAULT '#3b82f6',
	`description` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `user_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`email` varchar(320) NOT NULL,
	`role` enum('operator','admin','super_admin') NOT NULL,
	`invitedBy` int NOT NULL,
	`positionId` int,
	`token` varchar(100) NOT NULL,
	`status` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`openId` varchar(64),
	`email` varchar(320),
	`passwordHash` varchar(255),
	`mustChangePassword` boolean DEFAULT true,
	`name` text,
	`loginMethod` varchar(64),
	`role` enum('operator','admin','super_admin') NOT NULL DEFAULT 'operator',
	`positionId` int,
	`status` enum('active','suspended','deleted') NOT NULL DEFAULT 'active',
	`avatarUrl` text,
	`displayName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `variant_customer_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`variantId` int NOT NULL,
	`customerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `variant_customer_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variant_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`variantId` int NOT NULL,
	`imageUrl` varchar(500) NOT NULL,
	`imageKey` varchar(500) NOT NULL,
	`fileName` varchar(200) NOT NULL,
	`fileSize` int NOT NULL,
	`sortOrder` int NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`uploadedBy` int,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `variant_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variant_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`variantId` int NOT NULL,
	`materialColorId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`materialType` varchar(50) DEFAULT 'fabric',
	`materialTypeId` int,
	`quantityUsed` decimal(15,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `variant_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variant_pricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`variantId` int NOT NULL,
	`factoryCostRmbExTax` decimal(10,2),
	`factoryCostRmbIncTax` decimal(10,2),
	`factoryCostUsdFob` decimal(10,2),
	`myCostRmb` decimal(10,2),
	`myCostUsd` decimal(10,2),
	`fobFeeRmb` decimal(10,2),
	`sellingPriceRmbIncTax` decimal(10,2),
	`sellingPriceFobL1` decimal(10,2),
	`sellingPriceFobL2` decimal(10,2),
	`sellingPriceFobL3` decimal(10,2),
	`effectiveDate` timestamp NOT NULL,
	`isCurrent` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `variant_pricing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variant_pricing_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`variantId` int NOT NULL,
	`fieldName` varchar(100) NOT NULL,
	`oldValue` varchar(50),
	`newValue` varchar(50),
	`remarks` text,
	`modifiedBy` int,
	`modifiedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `variant_pricing_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variant_suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`erpCompanyId` int,
	`variantId` int NOT NULL,
	`supplierId` int NOT NULL,
	`factoryItemCode` varchar(100),
	`factoryQuote` decimal(10,2),
	`moq` int,
	`leadTimeDays` int,
	`isDefault` boolean NOT NULL DEFAULT false,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `variant_suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attributes` ADD CONSTRAINT `attributes_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attributes` ADD CONSTRAINT `attributes_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `companies` ADD CONSTRAINT `companies_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `companies` ADD CONSTRAINT `companies_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `companies` ADD CONSTRAINT `companies_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_assignees` ADD CONSTRAINT `company_assignees_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_assignees` ADD CONSTRAINT `company_assignees_companyId_companies_id_fk` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_assignees` ADD CONSTRAINT `company_assignees_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_assignees` ADD CONSTRAINT `company_assignees_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_attachment_categories` ADD CONSTRAINT `company_attachment_categories_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_attachment_categories` ADD CONSTRAINT `company_attachment_categories_companyId_companies_id_fk` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_attachment_categories` ADD CONSTRAINT `company_attachment_categories_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_attachments` ADD CONSTRAINT `company_attachments_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_attachments` ADD CONSTRAINT `company_attachments_companyId_companies_id_fk` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_attachments` ADD CONSTRAINT `company_attachments_categoryId_company_attachment_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `company_attachment_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_attachments` ADD CONSTRAINT `company_attachments_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_attachments` ADD CONSTRAINT `company_attachments_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_bank_accounts` ADD CONSTRAINT `company_bank_accounts_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_contacts` ADD CONSTRAINT `company_contacts_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_contacts` ADD CONSTRAINT `company_contacts_companyId_companies_id_fk` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_contacts` ADD CONSTRAINT `company_contacts_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_letterheads` ADD CONSTRAINT `company_letterheads_companyId_companies_id_fk` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_settings` ADD CONSTRAINT `company_settings_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_follow_ups` ADD CONSTRAINT `customer_follow_ups_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_follow_ups` ADD CONSTRAINT `customer_follow_ups_customerId_companies_id_fk` FOREIGN KEY (`customerId`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_follow_ups` ADD CONSTRAINT `customer_follow_ups_followUpBy_users_id_fk` FOREIGN KEY (`followUpBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_price_history` ADD CONSTRAINT `customer_price_history_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_price_history` ADD CONSTRAINT `customer_price_history_customerId_companies_id_fk` FOREIGN KEY (`customerId`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_price_history` ADD CONSTRAINT `customer_price_history_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_price_history` ADD CONSTRAINT `customer_price_history_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_price_history` ADD CONSTRAINT `customer_price_history_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_migratedToCompanyId_companies_id_fk` FOREIGN KEY (`migratedToCompanyId`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follow_up_records` ADD CONSTRAINT `follow_up_records_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follow_up_records` ADD CONSTRAINT `follow_up_records_companyId_companies_id_fk` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follow_up_records` ADD CONSTRAINT `follow_up_records_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follow_up_records` ADD CONSTRAINT `follow_up_records_followUpBy_users_id_fk` FOREIGN KEY (`followUpBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_boards` ADD CONSTRAINT `material_boards_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_boards` ADD CONSTRAINT `material_boards_supplierId_material_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `material_suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_boards` ADD CONSTRAINT `material_boards_categoryId_material_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `material_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_categories` ADD CONSTRAINT `material_categories_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_colors` ADD CONSTRAINT `material_colors_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_colors` ADD CONSTRAINT `material_colors_boardId_material_boards_id_fk` FOREIGN KEY (`boardId`) REFERENCES `material_boards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_suppliers` ADD CONSTRAINT `material_suppliers_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_suppliers` ADD CONSTRAINT `material_suppliers_materialTypeId_material_types_id_fk` FOREIGN KEY (`materialTypeId`) REFERENCES `material_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_suppliers` ADD CONSTRAINT `material_suppliers_categoryId_material_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `material_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_types` ADD CONSTRAINT `material_types_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_library` ADD CONSTRAINT `media_library_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_library` ADD CONSTRAINT `media_library_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operation_logs` ADD CONSTRAINT `operation_logs_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operation_logs` ADD CONSTRAINT `operation_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_variantId_product_variants_id_fk` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_customerId_companies_id_fk` FOREIGN KEY (`customerId`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_createdFromQuotationId_quotations_id_fk` FOREIGN KEY (`createdFromQuotationId`) REFERENCES `quotations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_deletedBy_users_id_fk` FOREIGN KEY (`deletedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_boxes` ADD CONSTRAINT `package_boxes_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_boxes` ADD CONSTRAINT `package_boxes_variantId_product_variants_id_fk` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissions` ADD CONSTRAINT `permissions_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissions` ADD CONSTRAINT `permissions_positionId_positions_id_fk` FOREIGN KEY (`positionId`) REFERENCES `positions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `positions` ADD CONSTRAINT `positions_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_history` ADD CONSTRAINT `price_history_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_history` ADD CONSTRAINT `price_history_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_history` ADD CONSTRAINT `price_history_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_batches` ADD CONSTRAINT `product_batches_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_batches` ADD CONSTRAINT `product_batches_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_batches` ADD CONSTRAINT `product_batches_customerId_companies_id_fk` FOREIGN KEY (`customerId`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_batches` ADD CONSTRAINT `product_batches_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_batches` ADD CONSTRAINT `product_batches_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_category_links` ADD CONSTRAINT `product_category_links_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_category_links` ADD CONSTRAINT `product_category_links_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_category_links` ADD CONSTRAINT `product_category_links_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_suppliers` ADD CONSTRAINT `product_suppliers_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_suppliers` ADD CONSTRAINT `product_suppliers_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_suppliers` ADD CONSTRAINT `product_suppliers_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_tag_links` ADD CONSTRAINT `product_tag_links_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_tag_links` ADD CONSTRAINT `product_tag_links_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_tag_links` ADD CONSTRAINT `product_tag_links_tagId_tags_id_fk` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_customerId_companies_id_fk` FOREIGN KEY (`customerId`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_materialColorId_material_colors_id_fk` FOREIGN KEY (`materialColorId`) REFERENCES `material_colors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_product_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `product_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_approvals` ADD CONSTRAINT `quotation_approvals_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_approvals` ADD CONSTRAINT `quotation_approvals_quotationId_quotations_id_fk` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_approvals` ADD CONSTRAINT `quotation_approvals_approverId_users_id_fk` FOREIGN KEY (`approverId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_batches` ADD CONSTRAINT `quotation_batches_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_batches` ADD CONSTRAINT `quotation_batches_quotationItemId_quotation_items_id_fk` FOREIGN KEY (`quotationItemId`) REFERENCES `quotation_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_batches` ADD CONSTRAINT `quotation_batches_variantId_product_variants_id_fk` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_quotationId_quotations_id_fk` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_templates` ADD CONSTRAINT `quotation_templates_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_templates` ADD CONSTRAINT `quotation_templates_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_versions` ADD CONSTRAINT `quotation_versions_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_versions` ADD CONSTRAINT `quotation_versions_quotationId_quotations_id_fk` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_versions` ADD CONSTRAINT `quotation_versions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_customerId_companies_id_fk` FOREIGN KEY (`customerId`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_parentQuotationId_quotations_id_fk` FOREIGN KEY (`parentQuotationId`) REFERENCES `quotations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_convertedToOrderId_orders_id_fk` FOREIGN KEY (`convertedToOrderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_sentBy_users_id_fk` FOREIGN KEY (`sentBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sku_rules` ADD CONSTRAINT `sku_rules_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_categories` ADD CONSTRAINT `supplier_categories_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tags` ADD CONSTRAINT `tags_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tags` ADD CONSTRAINT `tags_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_invitations` ADD CONSTRAINT `user_invitations_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_invitations` ADD CONSTRAINT `user_invitations_invitedBy_users_id_fk` FOREIGN KEY (`invitedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_invitations` ADD CONSTRAINT `user_invitations_positionId_positions_id_fk` FOREIGN KEY (`positionId`) REFERENCES `positions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_positionId_positions_id_fk` FOREIGN KEY (`positionId`) REFERENCES `positions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_customer_links` ADD CONSTRAINT `variant_customer_links_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_customer_links` ADD CONSTRAINT `variant_customer_links_variantId_product_variants_id_fk` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_customer_links` ADD CONSTRAINT `variant_customer_links_customerId_companies_id_fk` FOREIGN KEY (`customerId`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_images` ADD CONSTRAINT `variant_images_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_images` ADD CONSTRAINT `variant_images_variantId_product_variants_id_fk` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_images` ADD CONSTRAINT `variant_images_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_materials` ADD CONSTRAINT `variant_materials_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_materials` ADD CONSTRAINT `variant_materials_variantId_product_variants_id_fk` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_materials` ADD CONSTRAINT `variant_materials_materialColorId_material_colors_id_fk` FOREIGN KEY (`materialColorId`) REFERENCES `material_colors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_materials` ADD CONSTRAINT `variant_materials_materialTypeId_material_types_id_fk` FOREIGN KEY (`materialTypeId`) REFERENCES `material_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_pricing` ADD CONSTRAINT `variant_pricing_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_pricing` ADD CONSTRAINT `variant_pricing_variantId_product_variants_id_fk` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_pricing` ADD CONSTRAINT `variant_pricing_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_pricing_history` ADD CONSTRAINT `variant_pricing_history_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_pricing_history` ADD CONSTRAINT `variant_pricing_history_variantId_product_variants_id_fk` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_pricing_history` ADD CONSTRAINT `variant_pricing_history_modifiedBy_users_id_fk` FOREIGN KEY (`modifiedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_suppliers` ADD CONSTRAINT `variant_suppliers_erpCompanyId_erp_companies_id_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_suppliers` ADD CONSTRAINT `variant_suppliers_variantId_product_variants_id_fk` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_suppliers` ADD CONSTRAINT `variant_suppliers_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_suppliers` ADD CONSTRAINT `variant_suppliers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cooperation_status_idx` ON `companies` (`cooperationStatus`);--> statement-breakpoint
CREATE INDEX `country_idx` ON `companies` (`country`);--> statement-breakpoint
CREATE INDEX `customer_nature_idx` ON `companies` (`customerNature`);--> statement-breakpoint
CREATE INDEX `cooperation_level_idx` ON `companies` (`cooperationLevel`);--> statement-breakpoint
CREATE INDEX `assigned_to_idx` ON `companies` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `created_by_idx` ON `companies` (`createdBy`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `companies` (`createdAt`);--> statement-breakpoint
CREATE INDEX `company_name_idx` ON `companies` (`companyName`);--> statement-breakpoint
CREATE INDEX `company_assignees_company_id_idx` ON `company_assignees` (`companyId`);--> statement-breakpoint
CREATE INDEX `company_assignees_user_id_idx` ON `company_assignees` (`userId`);--> statement-breakpoint
CREATE INDEX `attachment_categories_company_id_idx` ON `company_attachment_categories` (`companyId`);--> statement-breakpoint
CREATE INDEX `attachments_company_id_idx` ON `company_attachments` (`companyId`);--> statement-breakpoint
CREATE INDEX `attachments_category_id_idx` ON `company_attachments` (`categoryId`);--> statement-breakpoint
CREATE INDEX `attachments_is_deleted_idx` ON `company_attachments` (`isDeleted`);--> statement-breakpoint
CREATE INDEX `company_bank_accounts_erp_company_idx` ON `company_bank_accounts` (`erpCompanyId`);--> statement-breakpoint
CREATE INDEX `company_bank_accounts_currency_idx` ON `company_bank_accounts` (`currency`);--> statement-breakpoint
CREATE INDEX `company_bank_accounts_sort_idx` ON `company_bank_accounts` (`erpCompanyId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `company_letterheads_company_idx` ON `company_letterheads` (`companyId`);--> statement-breakpoint
CREATE INDEX `company_settings_erp_company_idx` ON `company_settings` (`erpCompanyId`);--> statement-breakpoint
CREATE INDEX `customer_price_history_customer_product_idx` ON `customer_price_history` (`customerId`,`productId`);--> statement-breakpoint
CREATE INDEX `customer_price_history_transaction_date_idx` ON `customer_price_history` (`transactionDate`);--> statement-breakpoint
CREATE INDEX `material_boards_supplier_idx` ON `material_boards` (`supplierId`);--> statement-breakpoint
CREATE INDEX `material_boards_number_idx` ON `material_boards` (`boardNumber`);--> statement-breakpoint
CREATE INDEX `material_boards_category_idx` ON `material_boards` (`categoryId`);--> statement-breakpoint
CREATE INDEX `material_colors_board_idx` ON `material_colors` (`boardId`);--> statement-breakpoint
CREATE INDEX `material_colors_code_idx` ON `material_colors` (`colorCode`);--> statement-breakpoint
CREATE INDEX `package_boxes_erp_company_idx` ON `package_boxes` (`erpCompanyId`);--> statement-breakpoint
CREATE INDEX `package_boxes_variant_idx` ON `package_boxes` (`variantId`);--> statement-breakpoint
CREATE INDEX `package_boxes_sort_idx` ON `package_boxes` (`variantId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `batches_product_id_idx` ON `product_batches` (`productId`);--> statement-breakpoint
CREATE INDEX `batches_customer_id_idx` ON `product_batches` (`customerId`);--> statement-breakpoint
CREATE INDEX `batches_supplier_id_idx` ON `product_batches` (`supplierId`);--> statement-breakpoint
CREATE INDEX `batches_production_status_idx` ON `product_batches` (`productionStatus`);--> statement-breakpoint
CREATE INDEX `quotation_approvals_quotation_idx` ON `quotation_approvals` (`quotationId`);--> statement-breakpoint
CREATE INDEX `quotation_approvals_approver_idx` ON `quotation_approvals` (`approverId`);--> statement-breakpoint
CREATE INDEX `quotation_approvals_status_idx` ON `quotation_approvals` (`status`);--> statement-breakpoint
CREATE INDEX `quotation_batches_item_idx` ON `quotation_batches` (`quotationItemId`);--> statement-breakpoint
CREATE INDEX `quotation_batches_variant_idx` ON `quotation_batches` (`variantId`);--> statement-breakpoint
CREATE INDEX `quotation_items_quotation_idx` ON `quotation_items` (`quotationId`);--> statement-breakpoint
CREATE INDEX `quotation_items_product_idx` ON `quotation_items` (`productId`);--> statement-breakpoint
CREATE INDEX `quotation_versions_quotation_idx` ON `quotation_versions` (`quotationId`);--> statement-breakpoint
CREATE INDEX `quotation_versions_version_idx` ON `quotation_versions` (`quotationId`,`versionNumber`);--> statement-breakpoint
CREATE INDEX `quotations_customer_idx` ON `quotations` (`customerId`);--> statement-breakpoint
CREATE INDEX `quotations_status_idx` ON `quotations` (`status`);--> statement-breakpoint
CREATE INDEX `quotations_number_idx` ON `quotations` (`quotationNumber`);--> statement-breakpoint
CREATE INDEX `quotations_valid_until_idx` ON `quotations` (`validUntil`);--> statement-breakpoint
CREATE INDEX `quotations_created_at_idx` ON `quotations` (`createdAt`);--> statement-breakpoint
CREATE INDEX `sku_rules_erp_company_idx` ON `sku_rules` (`erpCompanyId`);--> statement-breakpoint
CREATE INDEX `sku_rules_rule_type_idx` ON `sku_rules` (`erpCompanyId`,`ruleType`);--> statement-breakpoint
CREATE INDEX `variant_materials_variant_idx` ON `variant_materials` (`variantId`);--> statement-breakpoint
CREATE INDEX `variant_materials_color_idx` ON `variant_materials` (`materialColorId`);--> statement-breakpoint
CREATE INDEX `variant_materials_type_idx` ON `variant_materials` (`materialTypeId`);--> statement-breakpoint
CREATE INDEX `variant_materials_sort_idx` ON `variant_materials` (`variantId`,`sortOrder`);