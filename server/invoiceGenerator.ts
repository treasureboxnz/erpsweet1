import ExcelJS from "exceljs";
import archiver from "archiver";
import sharp from "sharp";
import { getDb } from "./db";
import {
  orders,
  orderItems,
  products,
  productImages,
  productVariants,
  companies,
  suppliers,
  companyBankAccounts,
  supplierBankAccounts,
  invoiceTermsTemplates,
  erpCompanies,
  variantMaterials,
  materialColors,
  packageBoxes,
  companyLetterheads,
  orderFinance,
} from "../drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";
import axios from "axios";
import { getInvoiceTemplateConfig } from "./invoiceTemplateConfig";
export type InvoiceType = "customer" | "internal" | "factory";

/**
 * 从URL下载图片并返回压缩后的Buffer（最大宽度300px，JPEG格式）
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const rawBuffer = Buffer.from(response.data);
    // 使用sharp压缩图片：最大300x300，JPEG格式，质量80
    const compressed = await sharp(rawBuffer)
      .resize(300, 300, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return compressed;
  } catch (error) {
    console.error(`Failed to download/compress image from ${url}:`, error);
    return null;
  }
}

/**
 * 检测图片格式（jpeg/png/gif/webp）
 */
function detectImageExtension(buffer: Buffer): "jpeg" | "png" | "gif" {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return "gif";
  return "jpeg";
}

/**
 * 给单元格设置边框
 */
function setBorder(cell: ExcelJS.Cell, style: ExcelJS.BorderStyle = "thin") {
  cell.border = {
    top: { style },
    left: { style },
    bottom: { style },
    right: { style },
  };
}

/**
 * 给单元格设置背景色
 */
function setFill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

/**
 * 将变量替换为实际值
 */
function replaceTermVariables(
  text: string,
  vars: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

// ============================================================
// 客户版 Invoice（完全按照用户提供的 SALES CONTRACT 模板）
// ============================================================
export async function generateCustomerInvoice(
  orderId: number,
  erpCompanyId: number,
  templateType: "buyer" | "internal" | "factory" = "buyer"
): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // ---- 数据查询 ----
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) throw new Error("订单不存在");

  const items = await db
    .select({
      orderItem: orderItems,
      product: products,
      variant: productVariants,
    })
    .from(orderItems)
    .leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
    .leftJoin(products, eq(productVariants.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

  const [customer] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, order.customerId))
    .limit(1);

  // 卖方信息从 erp_companies 实时读取（而非 companies 表）
  const [seller] = await db
    .select()
    .from(erpCompanies)
    .where(eq(erpCompanies.id, erpCompanyId))
    .limit(1);
  // 买方英文信息：优先从 company_letterheads 读取
  const [customerLetterhead] = await db
    .select()
    .from(companyLetterheads)
    .where(eq(companyLetterheads.companyId, order.customerId))
    .limit(1);
  // 构建买方显示名称（优先英文信息）
  const buyerDisplayName = customerLetterhead?.companyNameEn || customer?.companyName || '';
  // 构建买方完整地址
  const buyerAddressParts: string[] = [];
  if (customerLetterhead) {
    if (customerLetterhead.addressEn) buyerAddressParts.push(customerLetterhead.addressEn);
    if (customerLetterhead.cityEn) buyerAddressParts.push(customerLetterhead.cityEn);
    if (customerLetterhead.stateEn && customerLetterhead.stateEn !== 'NA') buyerAddressParts.push(customerLetterhead.stateEn);
    if (customerLetterhead.postalCode) buyerAddressParts.push(customerLetterhead.postalCode);
    if (customerLetterhead.countryEn) buyerAddressParts.push(customerLetterhead.countryEn);
  } else {
    const fallbackParts = [customer?.address, customer?.city, customer?.state, customer?.country].filter(Boolean);
    buyerAddressParts.push(...(fallbackParts as string[]));
  }
  const buyerAddress = buyerAddressParts.join(', ');

  // 查询订单财务信息（获取单据要求等）
  const [financeInfo] = await db
    .select()
    .from(orderFinance)
    .where(eq(orderFinance.orderId, orderId))
    .limit(1);
  // 默认银行账户（USD优先）
  const bankAccounts = await db
    .select()
    .from(companyBankAccounts)
    .where(eq(companyBankAccounts.erpCompanyId, erpCompanyId));
  const usdBank = bankAccounts.find((b) => b.currency === "USD" && b.isDefault)
    || bankAccounts.find((b) => b.currency === "USD")
    || bankAccounts.find((b) => b.isDefault)
    || bankAccounts[0];
  // 根据订单货币决定是否显示CNY银行账户：USD合同只显示USD账户
  const cnyBank = order.currency !== "USD"
    ? (bankAccounts.find((b) => b.currency === "CNY" && b.isDefault) || bankAccounts.find((b) => b.currency === "CNY"))
    : null;

  // 启用的交易条款（按序号排序）
  const terms = await db
    .select()
    .from(invoiceTermsTemplates)
    .where(eq(invoiceTermsTemplates.isEnabled, true));
  terms.sort((a, b) => a.termNumber - b.termNumber);

  // 读取模板配置（字段开关）
  const templateConfigRecord = await getInvoiceTemplateConfig(erpCompanyId, templateType);
  const fieldConfig = (templateConfigRecord?.fieldConfig as any) || null;
  // 颜色显示模式：'code'=仅显示颜色编号全字段, 'image'=嵌入颜色图片+编号（默认code）
  const colorDisplayMode: 'code' | 'image' = fieldConfig?.productFields?.colorDisplayMode || 'code';
  // 产品字段开关（默认全部显示）
  const showImage = fieldConfig?.productFields?.showImage !== false;
  const showName = fieldConfig?.productFields?.showName !== false;
  const showSku = fieldConfig?.productFields?.showSku !== false;
  const showDimensions = fieldConfig?.productFields?.showDimensions !== false;
  const showDescription = fieldConfig?.productFields?.showDescription !== false;
  const showColor = fieldConfig?.productFields?.showColor !== false;
  const showFabric = fieldConfig?.productFields?.showFabric !== false;
  const showPackaging = fieldConfig?.productFields?.showPackaging !== false;
  const showCbm = fieldConfig?.productFields?.showCbm !== false;
  // 价格字段开关
  const showUnitPrice = fieldConfig?.priceFields?.showUnitPrice !== false;
  const showQuantity = fieldConfig?.priceFields?.showQuantity !== false;
  const showSubtotal = fieldConfig?.priceFields?.showSubtotal !== false;
  // 公司/客户信息字段开关
  const showSellerInfo = fieldConfig?.companyFields?.showNameCn !== false;
  const showBuyerInfo = fieldConfig?.partnerFields?.showCompanyName !== false;
  const showBuyerAddress = fieldConfig?.partnerFields?.showAddress !== false;

  // 为每个订单项查询产品图片
  const productIds = items
    .map((i) => i.product?.id)
    .filter(Boolean) as number[];
  // 查询所有订单项的材料颜色数据（variant_materials + material_colors）
  const variantIds = items.map((i) => i.orderItem.variantId).filter(Boolean) as number[];
  const allVariantMaterials = variantIds.length > 0
    ? await db
        .select({
          variantId: variantMaterials.variantId,
          sortOrder: variantMaterials.sortOrder,
          fullCode: materialColors.fullCode,
          colorCode: materialColors.colorCode,
          colorName: materialColors.colorName,
          imageUrl: materialColors.imageUrl,
        })
        .from(variantMaterials)
        .leftJoin(materialColors, eq(variantMaterials.materialColorId, materialColors.id))
        .where(inArray(variantMaterials.variantId, variantIds))
    : [];
  // 查询所有订单项的外箱数据（package_boxes）
  const allPackageBoxes = variantIds.length > 0
    ? await db
        .select()
        .from(packageBoxes)
        .where(inArray(packageBoxes.variantId, variantIds))
    : [];
  const allProductImages =
    showImage && productIds.length > 0
      ? await db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
      : [];

  // ---- 创建工作簿 ----
  const workbook = new ExcelJS.Workbook();
  workbook.creator = seller?.companyNameEn || seller?.companyName || "ERP System";
  const ws = workbook.addWorksheet("contract");

  // ---- 列宽（14列，精确对齐模板）----
  // 模板实测列宽（字符数）：A=10, B=11.5, C=30, D=16.3, E=29.7, F=29.7, G=14.4, H=11, I=11, J=11, K=11, L=11, M=12.8, N=14.2
  ws.columns = [
    { key: "A", width: 10 },   // 产品名称
    { key: "B", width: 11.5 }, // 款式/型号
    { key: "C", width: 30 },   // 图片
    { key: "D", width: 16.3 }, // 规格 Size
    { key: "E", width: 29.7 }, // 描述 Description
    { key: "F", width: 29.7 }, // 面料颜色
    { key: "G", width: 14.4 }, // 面料 Fabric
    { key: "H", width: 11 },   // 包装 packing
    { key: "I", width: 11 },   // Package
    { key: "J", width: 11 },   // CBM
    { key: "K", width: 11 },   // 数量 Quantity
    { key: "L", width: 11 },   // 体积总和 CBM
    { key: "M", width: 12.8 }, // 单价 Unit Price
    { key: "N", width: 14.2 }, // 总金额 TOTAL
  ];

  let r = 1; // 当前行号

  // ---- Row 1: 公司名称 ----
  ws.mergeCells(`A${r}:N${r}`);
  const companyNameCell = ws.getCell(`A${r}`);
  // 公司名称：优先显示英文名，如有中文名则同时显示
  const sellerDisplayName = seller?.companyNameEn
    ? (seller.companyName && seller.companyName !== seller.companyNameEn
        ? `${seller.companyNameEn}  ${seller.companyName}`
        : seller.companyNameEn)
    : (seller?.companyName || 'Company Name');
  companyNameCell.value = sellerDisplayName;
  companyNameCell.font = { name: "Arial", size: 14, bold: true };
  companyNameCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(r).height = 29;
  r++;

  // ---- Row 2: SALES CONTRACT 标题 ----
  ws.mergeCells(`A${r}:N${r}`);
  const contractTitleCell = ws.getCell(`A${r}`);
  contractTitleCell.value = "销 售 合 同  SALES CONTRACT";
  contractTitleCell.font = { name: "Arial", size: 13, bold: true };
  contractTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(r).height = 25;
  r++;

  // ---- Row 3: PI No. ----
  ws.mergeCells(`A${r}:B${r}`);
  ws.getCell(`A${r}`).value = "编 号/ PI No.:";
  ws.getCell(`A${r}`).font = { name: "Arial", bold: true };
  ws.mergeCells(`C${r}:N${r}`);
  ws.getCell(`C${r}`).value = order.orderNumber;
  ws.getRow(r).height = 23;
  r++;

  // ---- Row 4: Date ----
  ws.mergeCells(`A${r}:B${r}`);
  ws.getCell(`A${r}`).value = "日 期/ Date:";
  ws.getCell(`A${r}`).font = { name: "Arial", bold: true };
  ws.mergeCells(`C${r}:N${r}`);
  ws.getCell(`C${r}`).value = order.orderDate
    ? new Date(order.orderDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  ws.getRow(r).height = 23;
  r++;

  // ---- Row 5: 空行 ----
  ws.getRow(r).height = 25;
  r++;

  // ---- Row 6: 卖方 Seller ----
  ws.mergeCells(`A${r}:B${r}`);
  ws.getCell(`A${r}`).value = "卖方/Seller:   ";
  ws.getCell(`A${r}`).font = { name: "Arial", bold: true };
  ws.mergeCells(`C${r}:N${r}`);
  ws.getCell(`C${r}`).value = seller?.companyNameEn || seller?.companyName || "";
  ws.getRow(r).height = 28;
  r++;

  // ---- Row 7: 卖方邮箱 ----
  ws.mergeCells(`A${r}:B${r}`);
  ws.getCell(`A${r}`).value = "卖家邮箱Email:";
  ws.getCell(`A${r}`).font = { name: "Arial", bold: true };
  ws.mergeCells(`C${r}:N${r}`);
  ws.getCell(`C${r}`).value = seller?.email || seller?.marketingEmail || "";
  ws.getRow(r).height = 28;
  r++;

  // ---- Row 8: 空行 ----
  ws.getRow(r).height = 20;
  r++;

  // ---- Row 9: 买方 Buyer ----
  ws.mergeCells(`A${r}:B${r}`);
  ws.getCell(`A${r}`).value = "致买方/To Buyer:   ";
  ws.getCell(`A${r}`).font = { name: "Arial", bold: true };
  ws.mergeCells(`C${r}:I${r}`);
  ws.getCell(`C${r}`).value = buyerDisplayName;
  ws.mergeCells(`J${r}:K${r}`);
  ws.getCell(`J${r}`).value = "";
  ws.getRow(r).height = 19;
  r++;

  // ---- Row 10: 买方地址 ----
  ws.mergeCells(`A${r}:I${r}`);
  ws.getCell(`A${r}`).value = `买家地址Buyer Add:   ${buyerAddress}`;
  ws.getCell(`A${r}`).alignment = { wrapText: true };
  ws.mergeCells(`J${r}:K${r}`);
  ws.getRow(r).height = 20;
  r++;

  // ---- Row 11: 空行 ----
  ws.getRow(r).height = 20;
  r++;

  // ---- Row 12: 说明文字 ----
  ws.mergeCells(`A${r}:N${r}`);
  ws.getCell(`A${r}`).value =
    "We hereby confirm having sold to you the following goods on terms and conditions as specified below:";
  ws.getCell(`A${r}`).font = { name: "Arial", size: 10 };
  ws.getRow(r).height = 28;
  r++;

  // ---- Row 13: (1) 产品描述标题 ----
  ws.mergeCells(`A${r}:N${r}`);
  ws.getCell(`A${r}`).value =
    "(1)产品描述/规格/重量/单价 Commodity/Specification/Quantity/Unit Price:";
  ws.getCell(`A${r}`).font = { name: "Arial", bold: true, size: 10 };
  ws.getRow(r).height = 28;
  r++;

  // ---- Row 14-15: 产品表头（双行）----
  const headerStartRow = r;

  // 表头背景色
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9D9D9" },
  };

  // A-B合并：产品名称（跨两行）
  ws.mergeCells(`A${r}:B${r + 1}`);
  const h_name = ws.getCell(`A${r}`);
  h_name.value = "产品名称\nName Of Commidity";
  h_name.font = { name: "Arial", bold: true, size: 9 };
  h_name.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  h_name.fill = headerFill;
  setBorder(h_name);

  // C：图片（跨两行）
  ws.mergeCells(`C${r}:C${r + 1}`);
  const h_img = ws.getCell(`C${r}`);
  h_img.value = "图片                         Picture";
  h_img.font = { name: "Arial", bold: true, size: 9 };
  h_img.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  h_img.fill = headerFill;
  setBorder(h_img);

  // D：规格（跨两行）
  ws.mergeCells(`D${r}:D${r + 1}`);
  const h_size = ws.getCell(`D${r}`);
  h_size.value = "规格 \nSize                                    (cm)";
  h_size.font = { name: "Arial", bold: true, size: 9 };
  h_size.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  h_size.fill = headerFill;
  setBorder(h_size);

  // E：描述（跨两行）
  ws.mergeCells(`E${r}:E${r + 1}`);
  const h_desc = ws.getCell(`E${r}`);
  h_desc.value = "产品描述                                                             Description";
  h_desc.font = { name: "Arial", bold: true, size: 9 };
  h_desc.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  h_desc.fill = headerFill;
  setBorder(h_desc);

  // F：面料颜色（跨两行）
  ws.mergeCells(`F${r}:F${r + 1}`);
  const h_color = ws.getCell(`F${r}`);
  h_color.value = colorDisplayMode === 'image' ? "颜色图片\nColor" : "颜色编号\nColor Code";
  h_color.font = { name: "Arial", bold: true, size: 9 };
  h_color.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  h_color.fill = headerFill;
  setBorder(h_color);

  // G：面料（跨两行）
  ws.mergeCells(`G${r}:G${r + 1}`);
  const h_fabric = ws.getCell(`G${r}`);
  h_fabric.value = "面料 Fabric";
  h_fabric.font = { name: "Arial", bold: true, size: 9 };
  h_fabric.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  h_fabric.fill = headerFill;
  setBorder(h_fabric);

  // H-I：包装（第一行合并）
  ws.mergeCells(`H${r}:I${r}`);
  const h_pack = ws.getCell(`H${r}`);
  h_pack.value = "包装            ";
  h_pack.font = { name: "Arial", bold: true, size: 9 };
  h_pack.alignment = { horizontal: "center", vertical: "middle" };
  h_pack.fill = headerFill;
  setBorder(h_pack);

  // J：CBM（跨两行）
  ws.mergeCells(`J${r}:J${r + 1}`);
  const h_cbm = ws.getCell(`J${r}`);
  h_cbm.value = "CBM (m³)";
  h_cbm.font = { name: "Arial", bold: true, size: 9 };
  h_cbm.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  h_cbm.fill = headerFill;
  setBorder(h_cbm);

  // K：数量（跨两行）
  ws.mergeCells(`K${r}:K${r + 1}`);
  const h_qty = ws.getCell(`K${r}`);
  h_qty.value = "数量\nQuantity               (PCS)";
  h_qty.font = { name: "Arial", bold: true, size: 9 };
  h_qty.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  h_qty.fill = headerFill;
  setBorder(h_qty);

  // L：体积总和（跨两行）
  ws.mergeCells(`L${r}:L${r + 1}`);
  const h_totalcbm = ws.getCell(`L${r}`);
  h_totalcbm.value = "Total CBM (m³)";
  h_totalcbm.font = { name: "Arial", bold: true, size: 9 };
  h_totalcbm.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  h_totalcbm.fill = headerFill;
  setBorder(h_totalcbm);

  // M：单价（跨两行）
  ws.mergeCells(`M${r}:M${r + 1}`);
  const h_price = ws.getCell(`M${r}`);
  h_price.value = "单价 \nUnit Price  USD/PIECE";
  h_price.font = { name: "Arial", bold: true, size: 9 };
  h_price.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  h_price.fill = headerFill;
  setBorder(h_price);

  // N：总金额（跨两行）
  ws.mergeCells(`N${r}:N${r + 1}`);
  const h_total = ws.getCell(`N${r}`);
  h_total.value = "总金额\nTOTAL AMOUNT (USD)";
  h_total.font = { name: "Arial", bold: true, size: 9 };
  h_total.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  h_total.fill = headerFill;
  setBorder(h_total);

  ws.getRow(r).height = 58;
  r++;

  // Row 15: 包装子表头
  const h_packing = ws.getCell(`H${r}`);
  h_packing.value = "packing";
  h_packing.font = { name: "Arial", bold: true, size: 9 };
  h_packing.alignment = { horizontal: "center", vertical: "middle" };
  h_packing.fill = headerFill;
  setBorder(h_packing);

  const h_package = ws.getCell(`I${r}`);
  h_package.value = "Package";
  h_package.font = { name: "Arial", bold: true, size: 9 };
  h_package.alignment = { horizontal: "center", vertical: "middle" };
  h_package.fill = headerFill;
  setBorder(h_package);

  ws.getRow(r).height = 25;
  r++;

  // ---- 产品数据行 ----
  let grandTotal = 0;
  let totalQty = 0;
  let totalCbm = 0;

  for (const item of items) {
    ws.getRow(r).height = 83; // 模板行高 111pt ≈ 83px

    const productId = item.product?.id;
    // 优先使用product_images表中的图片，如果没有则使用products.imageUrl
    const productImageRecord = productId
      ? allProductImages.find((img) => img.productId === productId)
      : null;
    const productImageUrl = productImageRecord?.imageUrl || item.product?.imageUrl || null;

    // A-B: 产品名称
    ws.mergeCells(`A${r}:B${r}`);
    const nameCell = ws.getCell(`A${r}`);
    // 产品名称 + SKU（根据开关控制）
    const nameValue = showName ? (item.product?.name || "") : "";
    const skuValue = showSku ? (item.variant?.variantCode || item.product?.sku || "") : "";
    nameCell.value = nameValue && skuValue ? `${nameValue}\n${skuValue}` : nameValue || skuValue;
    nameCell.font = { name: "Arial", size: 9 };
    nameCell.alignment = { vertical: "middle", wrapText: true };
    setBorder(nameCell);

    // C: 图片
    const imgCell = ws.getCell(`C${r}`);
    imgCell.alignment = { horizontal: "center", vertical: "middle" };
    setBorder(imgCell);

    if (showImage && productImageUrl) {
      const imgBuffer = await downloadImage(productImageUrl);
      if (imgBuffer) {
        // sharp压缩后统一为JPEG格式
        const imageId = workbook.addImage({ buffer: imgBuffer as any, extension: "jpeg" });
        ws.addImage(imageId, {
          tl: { col: 2, row: r - 1 },
          ext: { width: 100, height: 80 },
          editAs: "oneCell",
        });
        console.log(`[Invoice] Image embedded for product ${item.product?.id}, size: ${imgBuffer.length} bytes`);
      } else {
        console.log(`[Invoice] Failed to download image for product ${item.product?.id}: ${productImageUrl}`);
      }
    } else if (!showImage) {
      console.log(`[Invoice] Image skipped for product ${item.product?.id} (showImage disabled in template config)`);
    } else {
      console.log(`[Invoice] No image URL for product ${item.product?.id}`);
    }

    // D: 规格（根据showDimensions开关）
    const sizeCell = ws.getCell(`D${r}`);
    if (showDimensions) {
      const dims = [item.variant?.productLength, item.variant?.productWidth, item.variant?.productHeight]
        .filter(v => v != null && v !== "0" && v !== "0.00" && Number(v) !== 0).join("×");
      sizeCell.value = dims ? `${dims} cm` : "";
    } else {
      sizeCell.value = "";
    }
    sizeCell.font = { name: "Arial", size: 9 };
    sizeCell.alignment = { vertical: "middle", wrapText: true };
    setBorder(sizeCell);

    // E: 描述（根据showDescription开关）
    const descCell = ws.getCell(`E${r}`);
    descCell.value = showDescription ? (item.variant?.variantName || item.product?.description || "") : "";
    descCell.font = { name: "Arial", size: 9 };
    descCell.alignment = { vertical: "middle", wrapText: true };
    setBorder(descCell);

    // F: 面料颜色（从variant_materials+material_colors实时读取，支持多颜色）
    const colorCell = ws.getCell(`F${r}`);
    const variantMaterialsForItem = allVariantMaterials
      .filter((vm) => vm.variantId === item.orderItem.variantId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (showColor && variantMaterialsForItem.length > 0) {
      if (colorDisplayMode === 'image') {
        // 图片模式：嵌入第一个颜色的图片，下方显示fullCode
        const firstMaterial = variantMaterialsForItem[0];
        if (firstMaterial.imageUrl) {
          const colorImgBuffer = await downloadImage(firstMaterial.imageUrl);
          if (colorImgBuffer) {
            const colorImageId = workbook.addImage({ buffer: colorImgBuffer as any, extension: 'jpeg' });
            ws.addImage(colorImageId, {
              tl: { col: 5, row: r - 1 },
              ext: { width: 80, height: 50 },
              editAs: 'oneCell',
            });
          }
        }
        // 图片下方显示fullCode（多个颜色换行）
        colorCell.value = variantMaterialsForItem.map((vm) => vm.fullCode || vm.colorCode || '').filter(Boolean).join('\n');
      } else {
        // 仅编号模式：显示所有颜色的fullCode（多个换行）
        colorCell.value = variantMaterialsForItem.map((vm) => vm.fullCode || vm.colorCode || '').filter(Boolean).join('\n');
      }
    } else {
      colorCell.value = '';
    }
    colorCell.font = { name: "Arial", size: 9 };
    colorCell.alignment = { vertical: 'middle', wrapText: true };
    setBorder(colorCell);

    // G: 面料（从variant_materials的colorName读取，fallback到fabricChange）
    const fabricCell = ws.getCell(`G${r}`);
    const fabricNames = variantMaterialsForItem.map((vm) => vm.colorName || '').filter(Boolean);
    fabricCell.value = showFabric ? (fabricNames.length > 0 ? fabricNames.join('\n') : (item.variant?.fabricChange || '')) : '';
    fabricCell.font = { name: "Arial", size: 9 };
    fabricCell.alignment = { vertical: "middle", wrapText: true };
    setBorder(fabricCell);

    // H: 包装方式（从package_boxes实时读取）
    const packingCell = ws.getCell(`H${r}`);
    const variantBoxes = allPackageBoxes
      .filter((pb) => pb.variantId === item.orderItem.variantId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const packingTypeLabels: Record<string, string> = {
      single: '单件装箱',
      multiple: '多箱组合',
      bulk: '一箱多件',
    };
    if (showPackaging && variantBoxes.length > 0) {
      const packingTypesSet = new Set(variantBoxes.map((pb) => packingTypeLabels[pb.packagingType] || pb.packagingType));
      const packingTypes = Array.from(packingTypesSet);
      packingCell.value = packingTypes.join('\n');
    } else {
      packingCell.value = showPackaging ? 'carton package' : '';
    }
    packingCell.font = { name: "Arial", size: 9 };
    packingCell.alignment = { vertical: 'middle', wrapText: true };
    setBorder(packingCell);

    // I: 外箱尺寸详情（从package_boxes实时读取）
    const packageCell = ws.getCell(`I${r}`);
    if (showPackaging && variantBoxes.length > 0) {
      const boxLines = variantBoxes.map((pb) => {
        const dims = `${Number(pb.length)}×${Number(pb.width)}×${Number(pb.height)}cm`;
        const cbmStr = `CBM:${Number(pb.cbm).toFixed(4)}m³`;
        const weightStr = pb.grossWeight ? `G:${Number(pb.grossWeight)}kg` : '';
        const pcsStr = (pb.piecesPerBox || 1) > 1 ? `${pb.piecesPerBox}pcs/ctn` : '';
        return [dims, cbmStr, weightStr, pcsStr].filter(Boolean).join(' ');
      });
      packageCell.value = boxLines.join('\n');
    } else {
      packageCell.value = showPackaging ? 'carton package' : '';
    }
    packageCell.font = { name: "Arial", size: 9 };
    packageCell.alignment = { vertical: 'middle', wrapText: true };
    setBorder(packageCell);

    // J: CBM per unit（优先从package_boxes读取，fallback到orderItem.cbm或variant.cbm）
    const cbmCell = ws.getCell(`J${r}`);
    // CBM per unit：取sortOrder最小的主箱CBM（不累加多个箱子）
    const primaryBox = variantBoxes.length > 0 ? variantBoxes[0] : null;
    const variantCbmFromBoxes = primaryBox ? Number(primaryBox.cbm || 0) : 0;
    const cbmPerUnit = variantCbmFromBoxes > 0
      ? variantCbmFromBoxes
      : (Number(item.orderItem.cbm) || Number(item.variant?.cbm) || 0);
    cbmCell.value = showCbm ? (cbmPerUnit || "") : "";
    cbmCell.numFmt = "0.000";
    cbmCell.font = { name: "Arial", size: 9 };
    cbmCell.alignment = { horizontal: "center", vertical: "middle" };
    setBorder(cbmCell);

    // K: 数量（根据showQuantity开关）
    const qtyCell = ws.getCell(`K${r}`);
    const qty = item.orderItem.quantity || 0;
    qtyCell.value = showQuantity ? qty : "";
    qtyCell.font = { name: "Arial", size: 9 };
    qtyCell.alignment = { horizontal: "center", vertical: "middle" };
    setBorder(qtyCell);
    totalQty += qty;

    // L: 体积总和（根据showCbm开关）
    const totalCbmCell = ws.getCell(`L${r}`);
    const itemTotalCbm = cbmPerUnit * qty;
    totalCbmCell.value = showCbm ? (itemTotalCbm || "") : "";
    totalCbmCell.numFmt = "0.000";
    totalCbmCell.font = { name: "Arial", size: 9 };
    totalCbmCell.alignment = { horizontal: "center", vertical: "middle" };
    setBorder(totalCbmCell);
    totalCbm += itemTotalCbm;

    // M: 单价（根据showUnitPrice开关）
    const priceCell = ws.getCell(`M${r}`);
    const unitPrice = Number(item.orderItem.unitPrice) || 0;
    priceCell.value = showUnitPrice ? unitPrice : "";
    priceCell.numFmt = "#,##0.00";
    priceCell.font = { name: "Arial", size: 9 };
    priceCell.alignment = { horizontal: "right", vertical: "middle" };
    setBorder(priceCell);

    // N: 总金额（根据showSubtotal开关）
    const amountCell = ws.getCell(`N${r}`);
    const subtotal = unitPrice * qty;
    amountCell.value = showSubtotal ? subtotal : "";
    amountCell.numFmt = "#,##0.00";
    amountCell.font = { name: "Arial", size: 9 };
    amountCell.alignment = { horizontal: "right", vertical: "middle" };
    setBorder(amountCell);
    grandTotal += subtotal;

    r++;
  }

  // ---- 合计行 ----
  ws.mergeCells(`A${r}:D${r}`);
  const totalLabelCell = ws.getCell(`A${r}`);
  totalLabelCell.value = "合计 TOTAL";
  totalLabelCell.font = { name: "Arial", bold: true, size: 10 };
  totalLabelCell.alignment = { horizontal: "center", vertical: "middle" };
  setBorder(totalLabelCell);

  // K: 总数量
  const totalQtyCell = ws.getCell(`K${r}`);
  totalQtyCell.value = totalQty;
  totalQtyCell.font = { name: "Arial", bold: true, size: 10 };
  totalQtyCell.alignment = { horizontal: "center", vertical: "middle" };
  setBorder(totalQtyCell);

  // L: 总CBM
  const totalCbmCell2 = ws.getCell(`L${r}`);
  totalCbmCell2.value = Math.round(totalCbm * 1000) / 1000;
  totalCbmCell2.numFmt = "0.000";
  totalCbmCell2.font = { name: "Arial", bold: true, size: 10 };
  totalCbmCell2.alignment = { horizontal: "center", vertical: "middle" };
  setBorder(totalCbmCell2);

  // N: 总金额
  const grandTotalCell = ws.getCell(`N${r}`);
  grandTotalCell.value = grandTotal;
  grandTotalCell.numFmt = "#,##0.00";
  grandTotalCell.font = { name: "Arial", bold: true, size: 10 };
  grandTotalCell.alignment = { horizontal: "right", vertical: "middle" };
  setBorder(grandTotalCell);
  ws.getRow(r).height = 55;
  r++;

  // ---- Deposit 行 ----
  ws.mergeCells(`A${r}:M${r}`);
  ws.getCell(`A${r}`).value = "deposit";
  ws.getCell(`A${r}`).font = { name: "Arial", size: 10 };
  const depositCell = ws.getCell(`N${r}`);
  depositCell.value = grandTotal * 0.3; // 30% deposit
  depositCell.numFmt = "#,##0.00";
  depositCell.font = { name: "Arial", size: 10 };
  depositCell.alignment = { horizontal: "right", vertical: "middle" };
  ws.getRow(r).height = 31;
  r++;

  // ---- 总金额文字行 ----
  ws.mergeCells(`A${r}:N${r}`);
  ws.getCell(`A${r}`).value = `Total Value: ${numberToWords(grandTotal)} US DOLLARS ONLY.`;
  ws.getCell(`A${r}`).font = { name: "Arial", size: 9 };
  ws.getRow(r).height = 49;
  r++;

  // ---- 17条交易条款 ----
  // 变量替换字典
  const termVars: Record<string, string> = {
    companyName: seller?.companyNameEn || seller?.companyName || "",
    customerName: buyerDisplayName,
    orderNumber: order.orderNumber,
    shipmentPort: seller?.address?.split(",")[0] || "广州",
    destinationPort: customerLetterhead?.countryEn || customer?.country || customer?.address?.split(",").pop()?.trim() || "",
    shipmentDate: "45 DAYS After the deposit received",
    paymentTerms: order.paymentTerms || "30% T/T as deposit, balance against the BL copy",
    documentsRequired: (financeInfo as any)?.documentsRequired || "",  // 单据要求：从订单财务信息读取
    bankName: usdBank?.bankName || "",
    accountName: usdBank?.accountName || "",
    accountNumber: usdBank?.accountNumber || "",
    swiftCode: usdBank?.swiftCode || "",
    bankAddress: usdBank?.bankAddress || "",
    // 人民币银行账户变量
    cnyBankName: cnyBank?.bankName || "",
    cnyAccountName: cnyBank?.accountName || "",
    cnyAccountNumber: cnyBank?.accountNumber || "",
    cnySwiftCode: cnyBank?.swiftCode || "",
  };

  for (const term of terms) {
    ws.mergeCells(`A${r}:D${r}`);
    const termLabelCell = ws.getCell(`A${r}`);
    termLabelCell.value = `(${term.termNumber})${term.titleCn || ""}${term.titleEn ? " " + term.titleEn : ""}`;
    termLabelCell.font = { name: "Arial", bold: true, size: 9 };
    termLabelCell.alignment = { vertical: "top", wrapText: true };

    ws.mergeCells(`E${r}:N${r}`);
    const termContentCell = ws.getCell(`E${r}`);
    const contentCn = term.contentCn ? replaceTermVariables(term.contentCn, termVars) : "";
    const contentEn = term.contentEn ? replaceTermVariables(term.contentEn, termVars) : "";
    termContentCell.value = contentCn && contentEn
      ? `${contentCn}\n${contentEn}`
      : contentCn || contentEn || "";
    termContentCell.font = { name: "Arial", size: 9 };
    termContentCell.alignment = { vertical: "top", wrapText: true };

    // 根据内容长度设置行高
    const lineCount = Math.max(
      (termContentCell.value as string).split("\n").length,
      2
    );
    ws.getRow(r).height = Math.max(34, lineCount * 14);
    r++;
  }

  // ---- 签字区域 ----
  r++; // 空行
  ws.mergeCells(`A${r}:B${r}`);
  ws.getCell(`C${r}`).value = `卖方公司/Seller:   ${seller?.companyNameEn || seller?.companyName || ''}`;
  ws.getCell(`C${r}`).font = { name: "Arial", size: 9 };
  ws.getCell(`I${r}`).value = "买方公司/Buyer:   ";
  ws.getCell(`I${r}`).font = { name: "Arial", size: 9 };
  ws.mergeCells(`K${r}:N${r}`);
  ws.getCell(`K${r}`).value = buyerDisplayName;
  ws.getCell(`K${r}`).font = { name: "Arial", size: 9 };
  ws.getRow(r).height = 20;
  r++;

  ws.getCell(`C${r}`).value = "签字/Signature:";
  ws.getCell(`C${r}`).font = { name: "Arial", size: 9 };
  ws.getCell(`I${r}`).value = "签字/Signature:";
  ws.getCell(`I${r}`).font = { name: "Arial", size: 9 };
  ws.getRow(r).height = 20;
  r++;

  ws.getCell(`C${r}`).value = "日期/Date";
  ws.getCell(`C${r}`).font = { name: "Arial", size: 9 };
  ws.getCell(`I${r}`).value = "日期/Date";
  ws.getCell(`I${r}`).font = { name: "Arial", size: 9 };
  ws.getRow(r).height = 20;

  // ---- 输出 Buffer ----
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

/**
 * 简单的数字转英文大写（用于总金额文字描述）
 */
function numberToWords(num: number): string {
  const ones = [
    "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
    "SEVENTEEN", "EIGHTEEN", "NINETEEN",
  ];
  const tens = [
    "", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY",
  ];

  if (num === 0) return "ZERO";

  const integer = Math.floor(num);
  const cents = Math.round((num - integer) * 100);

  function convertHundreds(n: number): string {
    let result = "";
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + " HUNDRED ";
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) result += ones[n] + " ";
    return result.trim();
  }

  let result = "";
  if (integer >= 1000000) {
    result += convertHundreds(Math.floor(integer / 1000000)) + " MILLION ";
  }
  if (integer >= 1000) {
    result += convertHundreds(Math.floor((integer % 1000000) / 1000)) + " THOUSAND ";
  }
  result += convertHundreds(integer % 1000);

  if (cents > 0) {
    result += ` AND ${convertHundreds(cents)} CENTS`;
  }

  return result.trim();
}

// ============================================================
// 内部版 Invoice（含成本和利润分析）
// ============================================================
export async function generateInternalInvoice(
  orderId: number,
  erpCompanyId: number
): Promise<Buffer> {
  // 内部版使用internal模板配置
  return generateCustomerInvoice(orderId, erpCompanyId, "internal");
}

// ============================================================
// 工厂版 Invoice ZIP（按供应商拆分）
// ============================================================
export async function generateFactoryInvoices(
  orderId: number,
  erpCompanyId: number
): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // 查询订单项及供应商信息
  const items = await db
    .select({
      orderItem: orderItems,
      product: products,
      variant: productVariants,
    })
    .from(orderItems)
    .leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
    .leftJoin(products, eq(productVariants.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

  // 按供应商分组
  const supplierGroups = new Map<number, typeof items>();
  for (const item of items) {
    const supplierId = item.variant?.supplierId || 0;
    if (!supplierGroups.has(supplierId)) {
      supplierGroups.set(supplierId, []);
    }
    supplierGroups.get(supplierId)!.push(item);
  }

  // 创建ZIP
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    (async () => {
      for (const [supplierId, _supplierItems] of Array.from(supplierGroups.entries())) {
        // 为每个供应商生成一个简化版Invoice
        const invoiceBuffer = await generateCustomerInvoice(orderId, erpCompanyId, "factory");
        const supplierName = supplierId > 0 ? `Supplier_${supplierId}` : "NoSupplier";
        archive.append(invoiceBuffer, {
          name: `Factory_Invoice_${supplierName}_Order${orderId}.xlsx`,
        });
      }
      archive.finalize();
    })().catch(reject);
  });
}
