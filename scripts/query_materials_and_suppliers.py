#!/usr/bin/env python3
"""
查询所有布料颜色和供应商数据，准备生成图片
"""

import os
import sys
import mysql.connector
from urllib.parse import urlparse
import json

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

# 1. 查询所有布料颜色数据
print("\n=== 查询所有布料颜色数据 ===")
cursor.execute("""
    SELECT 
      mc.id, 
      mc.colorCode, 
      mc.colorName, 
      mc.imageUrl,
      mb.boardNumber,
      ms.code as supplierCode,
      ms.name as supplierName
    FROM material_colors mc
    LEFT JOIN material_boards mb ON mc.boardId = mb.id
    LEFT JOIN material_suppliers ms ON mb.supplierId = ms.id
    ORDER BY mc.id
""")
colors = cursor.fetchall()
print(f"找到 {len(colors)} 个布料颜色")

# 统计没有图片的颜色
colors_without_image = [c for c in colors if not c['imageUrl']]
print(f"其中 {len(colors_without_image)} 个颜色没有图片")

# 保存到JSON文件
with open('/tmp/material_colors.json', 'w', encoding='utf-8') as f:
    # 转换为JSON可序列化的格式
    colors_data = []
    for c in colors:
        colors_data.append({
            'id': c['id'],
            'colorCode': c['colorCode'],
            'colorName': c['colorName'],
            'imageUrl': c['imageUrl'],
            'boardNumber': c['boardNumber'],
            'supplierCode': c['supplierCode'],
            'supplierName': c['supplierName']
        })
    json.dump(colors_data, f, ensure_ascii=False, indent=2)
print("布料颜色数据已保存到 /tmp/material_colors.json")

# 2. 查询所有供应商数据
print("\n=== 查询所有供应商数据 ===")
cursor.execute("""
    SELECT id, supplierName, supplierCode, logoUrl 
    FROM suppliers 
    ORDER BY id
""")
suppliers = cursor.fetchall()
print(f"找到 {len(suppliers)} 个供应商")

# 统计没有logo的供应商
suppliers_without_logo = [s for s in suppliers if not s['logoUrl']]
print(f"其中 {len(suppliers_without_logo)} 个供应商没有logo")

# 保存到JSON文件
with open('/tmp/suppliers.json', 'w', encoding='utf-8') as f:
    # 转换为JSON可序列化的格式
    suppliers_data = []
    for s in suppliers:
        suppliers_data.append({
            'id': s['id'],
            'supplierName': s['supplierName'],
            'supplierCode': s['supplierCode'],
            'logoUrl': s['logoUrl']
        })
    json.dump(suppliers_data, f, ensure_ascii=False, indent=2)
print("供应商数据已保存到 /tmp/suppliers.json")

# 关闭连接
cursor.close()
conn.close()

print("\n=== 查询完成 ===")
print(f"需要生成图片的布料颜色: {len(colors_without_image)} 个")
print(f"需要生成logo的供应商: {len(suppliers_without_logo)} 个")
