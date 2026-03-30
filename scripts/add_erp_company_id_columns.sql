-- 手动添加 erpCompanyId 字段到所有业务表
-- 所有字段都设置为 NULL，以便后续更新数据

-- 1. 创建 erp_companies 表
CREATE TABLE IF NOT EXISTS `erp_companies` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `companyCode` varchar(50) NOT NULL UNIQUE,
  `companyName` varchar(200) NOT NULL,
  `companyNameEn` varchar(200),
  `logo` text,
  `address` text,
  `email` varchar(320),
  `phone` varchar(50),
  `status` enum('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active',
  `plan` enum('free', 'basic', 'pro', 'enterprise') NOT NULL DEFAULT 'free',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. 修改 users 表
ALTER TABLE `users` 
  ADD COLUMN `erpCompanyId` int NULL AFTER `id`,
  ADD COLUMN `passwordHash` varchar(255) NULL AFTER `email`,
  ADD COLUMN `mustChangePassword` boolean DEFAULT true AFTER `passwordHash`,
  MODIFY COLUMN `openId` varchar(64) NULL,
  ADD CONSTRAINT `users_erpCompanyId_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`);

-- 3. 为所有业务表添加 erpCompanyId 字段
ALTER TABLE `positions` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `permissions` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_categories` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `products` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_images` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `price_history` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `companies` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `contacts` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `company_contacts` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `follow_up_records` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `customers` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `customer_follow_ups` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `orders` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `order_items` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `user_invitations` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `operation_logs` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_suppliers` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_variants` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `variant_customer_links` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `variant_pricing` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `variant_pricing_history` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `variant_images` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `suppliers` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `supplier_categories` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `variant_suppliers` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `media_library` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `categories` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `tags` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_category_links` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_tag_links` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `order_status_history` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `attributes` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `company_assignees` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `company_attachment_categories` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `company_attachments` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `system_settings` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_batches` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `customer_price_history` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `quotations` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `quotation_items` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `quotation_batches` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `quotation_versions` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `quotation_approvals` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `quotation_templates` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `material_categories` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `material_suppliers` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `material_boards` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `material_colors` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `variant_materials` ADD COLUMN `erpCompanyId` int NULL AFTER `id`;

-- 4. 插入测试公司数据
INSERT INTO `erp_companies` (`companyCode`, `companyName`, `companyNameEn`, `status`, `plan`) 
VALUES ('TEST', '测试公司', 'Test Company', 'active', 'free');

-- 5. 更新所有现有数据，设置 erpCompanyId = 1（测试公司）
UPDATE `positions` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `permissions` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `product_categories` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `products` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `product_images` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `price_history` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `companies` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `contacts` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `company_contacts` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `follow_up_records` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `customers` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `customer_follow_ups` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `orders` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `order_items` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `user_invitations` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `operation_logs` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `product_suppliers` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `product_variants` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `variant_customer_links` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `variant_pricing` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `variant_pricing_history` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `variant_images` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `suppliers` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `supplier_categories` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `variant_suppliers` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `media_library` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `categories` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `tags` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `product_category_links` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `product_tag_links` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `order_status_history` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `attributes` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `company_assignees` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `company_attachment_categories` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `company_attachments` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `system_settings` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `product_batches` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `customer_price_history` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `quotations` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `quotation_items` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `quotation_batches` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `quotation_versions` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `quotation_approvals` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `quotation_templates` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `material_categories` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `material_suppliers` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `material_boards` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `material_colors` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;
UPDATE `variant_materials` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;

-- 6. 更新 users 表，设置 erpCompanyId = 1
UPDATE `users` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL;

-- 完成！
SELECT '✓ 数据库迁移完成！' AS message;
