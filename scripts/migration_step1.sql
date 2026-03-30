-- 第1步：创建 erp_companies 表 + 插入测试公司
-- 这一步是最安全的，不会影响现有数据

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

-- 2. 插入测试公司数据
INSERT INTO `erp_companies` (`companyCode`, `companyName`, `companyNameEn`, `status`, `plan`) 
VALUES ('TEST', '测试公司', 'Test Company', 'active', 'free')
ON DUPLICATE KEY UPDATE `companyName` = '测试公司';

-- 验证
SELECT * FROM `erp_companies`;
