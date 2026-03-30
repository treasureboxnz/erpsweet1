#!/usr/bin/env python3
"""
为默认批次配置系统默认颜色、随机供应商和随机客户
"""

import os
import sys
import mysql.connector
from urllib.parse import urlparse
import random

# 从环境变量获取数据库连接信息
database_url = os.getenv('DATABASE_URL')
if not database_url:
    print("错误：未找到DATABASE_URL环境变量")
    sys.exit(1)

# 解析数据库URL
parsed = urlparse(database_url)
db_config = {
    'host': parsed.hostname,
    'port': parsed.port or 3306,
    'user': parsed.username,
    'password': parsed.password,
    'database': parsed.path.lstrip('/'),
}

print(f"连接数据库: {db_config['host']}:{db_config['port']}/{db_config['database']}")

# 连接数据库
conn = mysql.connector.connect(**db_config)
cursor = conn.cursor(dictionary=True)

# 1. 查询系统默认颜色
print("\n=== 查询系统默认颜色 ===")
cursor.execute("""
    SELECT id, colorCode, colorName 
    FROM material_colors 
    WHERE colorCode LIKE '%ORIG%' OR colorName LIKE '%ORIG%' OR colorName LIKE '%原色%'
    LIMIT 1
""")
default_color = cursor.fetchone()

if not default_color:
    print("错误：未找到系统默认颜色")
    sys.exit(1)

print(f"找到系统默认颜色: {default_color['colorCode']} - {default_color['colorName']} (ID: {default_color['id']})")

# 2. 查询所有供应商
print("\n=== 查询所有供应商 ===")
cursor.execute("SELECT id, supplierName, supplierCode FROM suppliers ORDER BY id")
suppliers = cursor.fetchall()
print(f"找到 {len(suppliers)} 个供应商")

# 3. 查询所有客户
print("\n=== 查询所有客户 ===")
cursor.execute("SELECT id, companyName FROM companies ORDER BY id")
customers = cursor.fetchall()
print(f"找到 {len(customers)} 个客户")

# 4. 查询所有默认批次
print("\n=== 查询所有默认批次 ===")
cursor.execute("""
    SELECT id, variantCode, materialColorId, supplierId, customerId 
    FROM product_variants 
    WHERE isDefault = 1
    ORDER BY id
""")
default_variants = cursor.fetchall()
print(f"找到 {len(default_variants)} 个默认批次")

# 5. 为每个默认批次配置数据
print("\n=== 开始配置默认批次数据 ===")
update_count = 0

for variant in default_variants:
    variant_id = variant['id']
    variant_code = variant['variantCode']
    
    # 选择供应商
    if suppliers:
        selected_supplier = random.choice(suppliers)
    else:
        print(f"警告：没有供应商可用，跳过批次 {variant_code}")
        continue
    
    # 选择客户
    if customers:
        selected_customer = random.choice(customers)
    else:
        print(f"警告：没有客户可用，跳过批次 {variant_code}")
        continue
    
    # 更新批次
    cursor.execute("""
        UPDATE product_variants 
        SET materialColorId = %s, supplierId = %s, customerId = %s
        WHERE id = %s
    """, (default_color['id'], selected_supplier['id'], selected_customer['id'], variant_id))
    
    update_count += 1
    print(f"✓ 默认批次 {variant_code}: 颜色={default_color['colorCode']}, 供应商={selected_supplier['supplierName']}, 客户={selected_customer['companyName']}")

# 提交更改
conn.commit()
print(f"\n=== 完成！成功更新 {update_count} 个默认批次 ===")

# 关闭连接
cursor.close()
conn.close()
