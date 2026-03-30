#!/usr/bin/env python3
"""
批量更新批次数据脚本
为每个批次配置：
1. 颜色（默认批次只选ORIG颜色，其他批次选择多样化颜色）
2. 供应商
3. 客户
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

# 1. 查询所有批次
print("\n=== 查询所有批次 ===")
cursor.execute("""
    SELECT id, productId, variantCode, variantName, variantType, isDefault, 
           materialColorId, supplierId, customerId 
    FROM product_variants 
    ORDER BY productId, isDefault DESC, id
""")
variants = cursor.fetchall()
print(f"找到 {len(variants)} 个批次")

# 2. 查询所有可用的颜色
print("\n=== 查询所有可用颜色 ===")
cursor.execute("""
    SELECT mc.id, mc.colorCode, mc.colorName, mb.boardNumber, ms.code as supplierCode
    FROM material_colors mc
    LEFT JOIN material_boards mb ON mc.boardId = mb.id
    LEFT JOIN material_suppliers ms ON mb.supplierId = ms.id
    ORDER BY mc.id
""")
colors = cursor.fetchall()
print(f"找到 {len(colors)} 个颜色")

# 找出ORIG颜色（包括系统默认颜色）
orig_colors = [c for c in colors if c['boardNumber'] and ('ORIG' in c['boardNumber'].upper() or 'ORIGINAL' in c['boardNumber'].upper())]
print(f"其中 {len(orig_colors)} 个ORIG颜色（包括系统默认）")

# 其他颜色
other_colors = [c for c in colors if c not in orig_colors]
print(f"其他颜色: {len(other_colors)} 个")

# 3. 查询所有供应商
print("\n=== 查询所有供应商 ===")
cursor.execute("SELECT id, supplierName, supplierCode FROM suppliers ORDER BY id")
suppliers = cursor.fetchall()
print(f"找到 {len(suppliers)} 个供应商")

# 4. 查询所有客户
print("\n=== 查询所有客户 ===")
cursor.execute("SELECT id, companyName FROM companies ORDER BY id")
customers = cursor.fetchall()
print(f"找到 {len(customers)} 个客户")

# 5. 为每个批次配置数据
print("\n=== 开始配置批次数据 ===")
update_count = 0

for variant in variants:
    variant_id = variant['id']
    variant_code = variant['variantCode']
    is_default = variant['isDefault']
    
    # 选择颜色
    if is_default:
        # 默认批次只选ORIG颜色
        if orig_colors:
            selected_color = random.choice(orig_colors)
        else:
            print(f"警告：没有ORIG颜色可用，跳过批次 {variant_code}")
            continue
    else:
        # 其他批次选择多样化颜色
        if other_colors:
            selected_color = random.choice(other_colors)
        else:
            print(f"警告：没有其他颜色可用，跳过批次 {variant_code}")
            continue
    
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
    """, (selected_color['id'], selected_supplier['id'], selected_customer['id'], variant_id))
    
    update_count += 1
    print(f"✓ 批次 {variant_code}: 颜色={selected_color['supplierCode']}-{selected_color['boardNumber']}-{selected_color['colorCode']}, 供应商={selected_supplier['supplierName']}, 客户={selected_customer['companyName']}")

# 提交更改
conn.commit()
print(f"\n=== 完成！成功更新 {update_count} 个批次 ===")

# 关闭连接
cursor.close()
conn.close()
