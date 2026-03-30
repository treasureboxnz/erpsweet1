#!/usr/bin/env python3
"""
第2步：修改 users 表 + 为所有业务表添加 erpCompanyId 字段
使用Python脚本动态检查并生成SQL，避免IF NOT EXISTS语法问题
"""

import os
import mysql.connector
from urllib.parse import urlparse

# 从环境变量获取数据库连接信息
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ 错误：未找到 DATABASE_URL 环境变量")
    exit(1)

# 解析数据库URL
url = urlparse(DATABASE_URL)
db_config = {
    'host': url.hostname,
    'port': url.port or 3306,
    'user': url.username,
    'password': url.password,
    'database': url.path.lstrip('/'),
}

# 连接数据库
conn = mysql.connector.connect(**db_config)
cursor = conn.cursor()

print("✓ 已连接到数据库")

# 1. 修改 users 表
print("\n=== 第1步：修改 users 表 ===")

# 检查 users 表是否已有 erpCompanyId 字段
cursor.execute("SHOW COLUMNS FROM `users` LIKE 'erpCompanyId'")
if not cursor.fetchone():
    print("  添加 erpCompanyId 字段...")
    cursor.execute("ALTER TABLE `users` ADD COLUMN `erpCompanyId` int NULL AFTER `id`")
    print("  ✓ erpCompanyId 字段已添加")
else:
    print("  ✓ erpCompanyId 字段已存在")

# 检查 users 表是否已有 passwordHash 字段
cursor.execute("SHOW COLUMNS FROM `users` LIKE 'passwordHash'")
if not cursor.fetchone():
    print("  添加 passwordHash 字段...")
    cursor.execute("ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(255) NULL AFTER `email`")
    print("  ✓ passwordHash 字段已添加")
else:
    print("  ✓ passwordHash 字段已存在")

# 检查 users 表是否已有 mustChangePassword 字段
cursor.execute("SHOW COLUMNS FROM `users` LIKE 'mustChangePassword'")
if not cursor.fetchone():
    print("  添加 mustChangePassword 字段...")
    cursor.execute("ALTER TABLE `users` ADD COLUMN `mustChangePassword` boolean DEFAULT true AFTER `passwordHash`")
    print("  ✓ mustChangePassword 字段已添加")
else:
    print("  ✓ mustChangePassword 字段已存在")

# 修改 openId 字段为可空
print("  修改 openId 字段为可空...")
cursor.execute("ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64) NULL")
print("  ✓ openId 字段已修改为可空")

# 添加外键约束
print("  添加外键约束...")
try:
    cursor.execute("ALTER TABLE `users` ADD CONSTRAINT `users_erpCompanyId_fk` FOREIGN KEY (`erpCompanyId`) REFERENCES `erp_companies`(`id`)")
    print("  ✓ 外键约束已添加")
except mysql.connector.Error as e:
    if e.errno == 1826 or 'Duplicate key' in str(e) or 'already exists' in str(e):
        print("  ✓ 外键约束已存在")
    else:
        print(f"  ⚠️  外键约束添加失败：{e}")

conn.commit()

# 2. 为所有业务表添加 erpCompanyId 字段
print("\n=== 第2步：为所有业务表添加 erpCompanyId 字段 ===")

tables = [
    "positions", "permissions", "product_categories", "products", "product_images",
    "price_history", "companies", "contacts", "company_contacts", "follow_up_records",
    "customers", "customer_follow_ups", "orders", "order_items", "user_invitations",
    "operation_logs", "product_suppliers", "product_variants", "variant_customer_links",
    "variant_pricing", "variant_pricing_history", "variant_images", "suppliers",
    "supplier_categories", "variant_suppliers", "media_library", "categories", "tags",
    "product_category_links", "product_tag_links", "order_status_history", "attributes",
    "company_assignees", "company_attachment_categories", "company_attachments",
    "system_settings", "product_batches", "customer_price_history", "quotations",
    "quotation_items", "quotation_batches", "quotation_versions", "quotation_approvals",
    "quotation_templates", "material_categories", "material_suppliers", "material_boards",
    "material_colors", "variant_materials"
]

added_count = 0
skipped_count = 0

for table in tables:
    # 检查表是否存在
    cursor.execute(f"SHOW TABLES LIKE '{table}'")
    if not cursor.fetchone():
        print(f"  ⚠️  表 {table} 不存在，跳过")
        skipped_count += 1
        continue
    
    # 检查字段是否已存在
    cursor.execute(f"SHOW COLUMNS FROM `{table}` LIKE 'erpCompanyId'")
    if not cursor.fetchone():
        try:
            cursor.execute(f"ALTER TABLE `{table}` ADD COLUMN `erpCompanyId` int NULL AFTER `id`")
            print(f"  ✓ 已为表 {table} 添加 erpCompanyId 字段")
            added_count += 1
        except mysql.connector.Error as e:
            print(f"  ❌ 表 {table} 添加字段失败：{e}")
    else:
        skipped_count += 1

conn.commit()

print(f"\n=== 完成！===")
print(f"  ✓ 新添加字段：{added_count} 个表")
print(f"  ✓ 已存在字段：{skipped_count} 个表")

# 关闭连接
cursor.close()
conn.close()

print("\n✓ 第2步执行完成！")
