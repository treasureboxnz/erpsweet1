#!/usr/bin/env python3
"""
分析所有router文件，找出需要添加erpCompanyId过滤的查询
"""
import os
import re
from pathlib import Path

# 需要添加erpCompanyId过滤的表（从schema.ts中提取的所有业务表）
TABLES_WITH_ERP_COMPANY_ID = [
    'customers', 'customerContacts', 'customerAssignees', 'customerTags',
    'products', 'productVariants', 'productImages', 'productMaterials',
    'categories', 'suppliers', 'supplierCategories', 'supplierContacts',
    'materials', 'orders', 'orderItems', 'quotations', 'quotationItems',
    'quotationVersions', 'quotationApprovals', 'quotationTemplates',
    'attributes', 'attributeValues', 'permissions', 'roles', 'rolePermissions',
    'operationLogs', 'tags', 'mediaFiles', 'variantSuppliers',
    'systemSettings', 'productCategories', 'productTags', 'productSuppliers',
    'orderPayments', 'orderShipments', 'orderNotes', 'quotationNotes',
    'customerNotes', 'supplierNotes', 'materialCategories', 'materialSuppliers',
    'materialPrices', 'productPrices', 'customerPrices', 'supplierPrices',
    'inventoryTransactions', 'inventoryAdjustments', 'purchaseOrders',
    'purchaseOrderItems', 'salesOrders', 'salesOrderItems'
]

def analyze_router_file(file_path):
    """分析单个router文件"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.content()
    
    results = []
    
    # 查找所有的db查询
    # 匹配模式：db.select().from(tableName) 或 db.query(tableName)
    patterns = [
        r'db\.select\(\)\.from\((\w+)\)',
        r'db\.query\((\w+)\)',
        r'await db\.insert\((\w+)\)',
        r'await db\.update\((\w+)\)',
        r'await db\.delete\((\w+)\)',
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, content)
        for match in matches:
            table_name = match.group(1)
            if table_name in TABLES_WITH_ERP_COMPANY_ID:
                line_num = content[:match.start()].count('\n') + 1
                results.append({
                    'file': file_path,
                    'line': line_num,
                    'table': table_name,
                    'code': content[match.start():min(match.end()+50, len(content))]
                })
    
    return results

def main():
    routers_dir = Path('/home/ubuntu/foreign-trade-erp/server/routers')
    all_results = []
    
    for router_file in routers_dir.glob('*.ts'):
        if 'userManagement' in router_file.name:
            continue  # 跳过用户管理文件
        
        results = analyze_router_file(router_file)
        all_results.extend(results)
    
    # 输出结果
    print(f"找到 {len(all_results)} 处需要添加 erpCompanyId 过滤的查询\n")
    
    # 按文件分组
    by_file = {}
    for result in all_results:
        file_name = os.path.basename(result['file'])
        if file_name not in by_file:
            by_file[file_name] = []
        by_file[file_name].append(result)
    
    for file_name, results in sorted(by_file.items()):
        print(f"\n{file_name}: {len(results)} 处")
        for result in results:
            print(f"  Line {result['line']}: {result['table']}")

if __name__ == '__main__':
    main()
