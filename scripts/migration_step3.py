#!/usr/bin/env python3
"""
第3步：更新所有现有数据，设置 erpCompanyId = 1（测试公司）
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

# 所有需要更新的表
tables = [
    "users", "positions", "permissions", "product_categories", "products", "product_images",
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

print("\n=== 更新所有现有数据的 erpCompanyId = 1 ===")

total_updated = 0

for table in tables:
    try:
        # 更新所有 erpCompanyId 为 NULL 的记录
        cursor.execute(f"UPDATE `{table}` SET `erpCompanyId` = 1 WHERE `erpCompanyId` IS NULL")
        updated_rows = cursor.rowcount
        if updated_rows > 0:
            print(f"  ✓ 表 {table}: 更新了 {updated_rows} 条记录")
            total_updated += updated_rows
        else:
            print(f"  - 表 {table}: 无需更新（已有数据或表为空）")
    except mysql.connector.Error as e:
        print(f"  ❌ 表 {table} 更新失败：{e}")

conn.commit()

print(f"\n=== 完成！===")
print(f"  ✓ 总共更新了 {total_updated} 条记录")
print(f"  ✓ 所有现有数据已分配到 erpCompanyId = 1（测试公司）")

# 关闭连接
cursor.close()
conn.close()

print("\n✓ 第3步执行完成！")
print("\n🎉 多租户架构数据库迁移全部完成！")
