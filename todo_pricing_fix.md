# 订单创建价格修复 (2026-02-16)

## 问题描述
订单创建页面选择批次后，价格显示为$0.00，无法正确读取批次的价格数据。

## 根本原因
1. 每个批次都有自己的定制化价格（存储在 `product_variants` 表的 `sellingPriceFOB`, `sellingPriceRMB`, `costPriceRMB` 字段）
2. 订单创建页面错误地从 `variant_pricing` 表读取价格（该表为空）
3. 忽略了批次自己的价格字段

## 修复方案
修改 `OrderCreate.tsx` 的 `handleSelectVariant` 函数：
- USD订单：优先读取 `variant.sellingPriceFOB`，fallback到 `pricing.sellingPriceFobL1`
- CNY订单：优先读取 `variant.sellingPriceRMB`，fallback到 `pricing.sellingPriceRmbIncTax`

## 修改的文件
- `client/src/pages/OrderCreate.tsx` (第168-191行)

## 测试验证
- [x] 修复代码逻辑
- [ ] 测试USD订单价格显示（应显示$109.00）
- [ ] 测试CNY订单价格显示（应显示￥985.00）
- [ ] 测试其他批次的价格读取
- [ ] 保存checkpoint
