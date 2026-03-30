# Product Dropdown Bug Investigation

## Issue
Product dropdown in QuotationEdit shows empty "()" instead of product names and SKUs.

## Root Cause
The products list query returns a different data structure than expected. The product data is nested under a `product` property.

## Evidence
- Dropdown shows multiple "()" entries
- Products exist in database but names not displaying
- TypeScript errors indicate property access issues

## Fix Needed
Update the Command component rendering logic to correctly access product.product.name and product.product.sku instead of product.name and product.sku.

## Location
File: /home/ubuntu/foreign-trade-erp/client/src/pages/QuotationEdit.tsx
Line: ~646-660 (CommandItem rendering)
