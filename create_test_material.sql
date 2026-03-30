-- 1. 创建材料类别（布料）
INSERT INTO material_categories (name, description, created_at, updated_at)
VALUES ('布料', '家具布料材料', NOW(), NOW());

-- 2. 创建供应商（戴维斯）
INSERT INTO material_suppliers (name, code, category_id, contact_person, contact_phone, contact_email, address, notes, status, created_at, updated_at)
SELECT '戴维斯', 'DAV', id, '张三', '13800138000', 'davis@example.com', '广东省佛山市', '优质布料供应商', 'active', NOW(), NOW()
FROM material_categories WHERE name = '布料' LIMIT 1;

-- 3. 创建布板（A01）
INSERT INTO material_boards (supplier_id, board_number, material_type, price_per_meter, currency, description, created_at, updated_at)
SELECT id, 'A01', '羊羔绒', 15.00, 'RMB', '白色羊羔绒布板', NOW(), NOW()
FROM material_suppliers WHERE code = 'DAV' LIMIT 1;

-- 4. 创建颜色（01 - 白色）
INSERT INTO material_colors (board_id, color_code, color_name, full_code, image_url, stock_status, notes, created_at, updated_at)
SELECT id, '01', '白色', 'DAV-A01-01', 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/bbFqbJnygZTsgwKd.jpg', 'in_stock', '纯白色羊羔绒', NOW(), NOW()
FROM material_boards WHERE board_number = 'A01' LIMIT 1;
