# 新建批次对话框 - 批次材料清单管理功能

## 任务清单

- [ ] Step 1: 在formData中添加materials数组字段
- [ ] Step 2: 添加useEffect，默认添加ORIG材料到materials数组
- [ ] Step 3: 在价格信息区域后添加"批次材料清单"UI区域
- [ ] Step 4: 实现添加材料功能（打开材料选择对话框）
- [ ] Step 5: 实现删除材料功能（主材料不可删除）
- [ ] Step 6: 实现材料排序功能（上移/下移）
- [ ] Step 7: 修改handleSubmit，创建批次后批量添加材料到数据库
- [ ] Step 8: UI测试验证所有功能
- [ ] Step 9: 保存checkpoint并交付

## 注意事项

1. 不改变现有的JSX结构，避免closing tag错误
2. 直接在价格信息区域后添加新的UI区域
3. 复制VariantMaterialsManager的UI样式，但改为适用于新建批次
4. 默认ORIG材料标记为主材料，不可删除
5. 其他材料标记为辅助材料，可以删除
