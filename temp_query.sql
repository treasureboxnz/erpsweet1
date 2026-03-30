SELECT id, variantCode, variantName, customerSku, supplierSku, customerId, variantType, erpCompanyId 
FROM product_variants 
WHERE variantCode = 'DC-001-GRY-V045' 
LIMIT 1;
