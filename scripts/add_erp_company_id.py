#!/usr/bin/env python3
"""
批量在schema.ts的所有业务表中添加 erpCompanyId 字段
"""

import re

# 需要添加 erpCompanyId 的表列表
TABLES_TO_UPDATE = [
    "positions",
    "permissions",
    "productCategories",
    "products",
    "productImages",
    "priceHistory",
    "companies",  # 客户公司表
    "contacts",
    "companyContacts",
    "followUpRecords",
    "customers",  # 旧的客户表（如果还存在）
    "customerFollowUps",
    "orders",
    "orderItems",
    "userInvitations",
    "operationLogs",
    "productSuppliers",
    "productVariants",
    "variantCustomerLinks",
    "variantPricing",
    "variantPricingHistory",
    "variantImages",
    "suppliers",
    "supplierCategories",
    "variantSuppliers",
    "mediaLibrary",
    "categories",
    "tags",
    "productCategoryLinks",
    "productTagLinks",
    "orderStatusHistory",
    "attributes",
    "companyAssignees",
    "companyAttachmentCategories",
    "companyAttachments",
    "systemSettings",
    "productBatches",
    "customerPriceHistory",
    "quotations",
    "quotationItems",
    "quotationBatches",
    "quotationVersions",
    "quotationApprovals",
    "quotationTemplates",
    "materialCategories",
    "materialSuppliers",
    "materialBoards",
    "materialColors",
    "variantMaterials",
]

# 不需要添加 erpCompanyId 的表（全局表或已有的表）
SKIP_TABLES = [
    "users",  # 已经添加了
    "erpCompanies",  # 这是多租户公司表本身
]

def add_erp_company_id_to_schema(schema_file_path):
    """
    读取schema.ts文件，在所有业务表中添加 erpCompanyId 字段
    """
    with open(schema_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 为每个表添加 erpCompanyId 字段
    for table_name in TABLES_TO_UPDATE:
        # 查找表定义的开始位置
        # 匹配模式：export const tableName = mysqlTable("table_name", {
        pattern = rf'(export const {table_name} = mysqlTable\([^{{]+\{{\s*\n\s*id: int\("id"\)\.autoincrement\(\)\.primaryKey\(\),)'
        
        # 替换模式：在id字段后添加 erpCompanyId 字段
        replacement = r'\1\n  erpCompanyId: int("erpCompanyId").references(() => erpCompanies.id), // 所属ERP公司（多租户）'
        
        # 执行替换
        new_content = re.sub(pattern, replacement, content)
        
        if new_content != content:
            print(f"✓ 已为表 {table_name} 添加 erpCompanyId 字段")
            content = new_content
        else:
            print(f"✗ 未找到表 {table_name} 或已存在 erpCompanyId 字段")
    
    # 写回文件
    with open(schema_file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\n✓ 完成！已更新 schema.ts 文件")

if __name__ == "__main__":
    schema_path = "/home/ubuntu/foreign-trade-erp/drizzle/schema.ts"
    add_erp_company_id_to_schema(schema_path)
