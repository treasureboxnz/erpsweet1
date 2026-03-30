-- 更新测试客户名称为真实的家具买家公司名称（英文）

-- 合作级别测试客户 → Premier Home Furnishings
UPDATE companies SET companyName = 'Premier Home Furnishings' WHERE companyName = '合作级别测试客户';

-- 多分类测试客户 → Modern Living Imports
UPDATE companies SET companyName = 'Modern Living Imports' WHERE companyName = '多分类测试客户';

-- Test Nature Category Company → Natural Comfort Furniture
UPDATE companies SET companyName = 'Natural Comfort Furniture' WHERE companyName = 'Test Nature Category Company';

-- 修复测试客户 → Lifestyle Furniture Group
UPDATE companies SET companyName = 'Lifestyle Furniture Group' WHERE companyName = '修复测试客户';

-- Debug测试客户 → Elite Home Decor
UPDATE companies SET companyName = 'Elite Home Decor' WHERE companyName = 'Debug测试客户';

-- 测试5星客户 → Premium Furniture Solutions
UPDATE companies SET companyName = 'Premium Furniture Solutions' WHERE companyName = '测试5星客户';

-- 测试公司ABC → Comfort Zone Furniture
UPDATE companies SET companyName = 'Comfort Zone Furniture' WHERE companyName = '测试公司ABC';

-- djf → Designer Furniture Boutique
UPDATE companies SET companyName = 'Designer Furniture Boutique' WHERE companyName = 'djf';

-- Test Company → Urban Living Furniture
UPDATE companies SET companyName = 'Urban Living Furniture' WHERE companyName = 'Test Company';

-- test01 → Contemporary Home Interiors
UPDATE companies SET companyName = 'Contemporary Home Interiors' WHERE companyName = 'test01';

-- Partial Company → Complete Home Furnishings
UPDATE companies SET companyName = 'Complete Home Furnishings' WHERE companyName = 'Partial Company';

-- Follow-up Test Company → Heritage Furniture Co
UPDATE companies SET companyName = 'Heritage Furniture Co' WHERE companyName = 'Follow-up Test Company';
