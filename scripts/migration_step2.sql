-- 第2步：修改 users 表 + 为所有业务表添加 erpCompanyId 字段
-- 这一步只添加字段，不修改数据

-- 1. 修改 users 表
ALTER TABLE `users` 
  ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`,
  ADD COLUMN IF NOT EXISTS `passwordHash` varchar(255) NULL AFTER `email`,
  ADD COLUMN IF NOT EXISTS `mustChangePassword` boolean DEFAULT true AFTER `passwordHash`,
  MODIFY COLUMN `openId` varchar(64) NULL;

-- 添加外键约束（如果不存在）
ALTER TABLE `users` 
  ADD CONSTRAINT `users_erpCompanyId_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`);

-- 2. 为所有业务表添加 erpCompanyId 字段
ALTER TABLE `positions` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `permissions` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_categories` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_images` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `price_history` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `companies` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `contacts` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `company_contacts` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `follow_up_records` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `customers` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `customer_follow_ups` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `order_items` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `user_invitations` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `operation_logs` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_suppliers` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_variants` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `variant_customer_links` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `variant_pricing` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `variant_pricing_history` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `variant_images` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `suppliers` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `supplier_categories` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `variant_suppliers` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `media_library` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `categories` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `tags` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_category_links` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_tag_links` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `order_status_history` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `attributes` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `company_assignees` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `company_attachment_categories` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `company_attachments` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `system_settings` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `product_batches` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `customer_price_history` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `quotations` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `quotation_items` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `quotation_batches` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `quotation_versions` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `quotation_approvals` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `quotation_templates` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `material_categories` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `material_suppliers` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `material_boards` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `material_colors` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;
ALTER TABLE `variant_materials` ADD COLUMN IF NOT EXISTS `erpCompanyId` int NULL AFTER `id`;

-- 验证：检查 users 表结构
DESCRIBE `users`;
