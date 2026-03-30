import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

console.log("开始创建测试产品数据...");

// 创建10个测试产品
const products = [
  {
    name: "现代简约沙发",
    sku: "SF-001",
    description: "三人位现代简约沙发，灰色布艺",
    costPrice: "1200.00",
    sellingPrice: "2500.00",
    stock: 50,
    unit: "件",
    status: "active",
    imageUrl: null,
    categoryId: null,
  },
  {
    name: "北欧风餐桌",
    sku: "DT-001",
    description: "实木餐桌，可容纳6人",
    costPrice: "800.00",
    sellingPrice: "1800.00",
    stock: 30,
    unit: "件",
    status: "active",
    imageUrl: null,
    categoryId: null,
  },
  {
    name: "办公椅",
    sku: "OC-001",
    description: "人体工学办公椅，可调节高度",
    costPrice: "300.00",
    sellingPrice: "680.00",
    stock: 100,
    unit: "件",
    status: "active",
    imageUrl: null,
    categoryId: null,
  },
  {
    name: "书柜",
    sku: "BC-001",
    description: "五层书柜，白色",
    costPrice: "450.00",
    sellingPrice: "950.00",
    stock: 40,
    unit: "件",
    status: "active",
    imageUrl: null,
    categoryId: null,
  },
  {
    name: "床垫",
    sku: "MT-001",
    description: "乳胶床垫，1.8m × 2.0m",
    costPrice: "600.00",
    sellingPrice: "1500.00",
    stock: 60,
    unit: "件",
    status: "active",
    imageUrl: null,
    categoryId: null,
  },
  {
    name: "茶几",
    sku: "CT-001",
    description: "大理石茶几，金色脚",
    costPrice: "350.00",
    sellingPrice: "800.00",
    stock: 45,
    unit: "件",
    status: "active",
    imageUrl: null,
    categoryId: null,
  },
  {
    name: "衣柜",
    sku: "WR-001",
    description: "四门衣柜，带镜子",
    costPrice: "1000.00",
    sellingPrice: "2200.00",
    stock: 25,
    unit: "件",
    status: "active",
    imageUrl: null,
    categoryId: null,
  },
  {
    name: "电视柜",
    sku: "TV-001",
    description: "现代电视柜，带储物抽屉",
    costPrice: "400.00",
    sellingPrice: "900.00",
    stock: 35,
    unit: "件",
    status: "active",
    imageUrl: null,
    categoryId: null,
  },
  {
    name: "梳妆台",
    sku: "DT-002",
    description: "带灯梳妆台，白色",
    costPrice: "500.00",
    sellingPrice: "1100.00",
    stock: 20,
    unit: "件",
    status: "active",
    imageUrl: null,
    categoryId: null,
  },
  {
    name: "鞋柜",
    sku: "SC-001",
    description: "多层鞋柜，可放30双鞋",
    costPrice: "250.00",
    sellingPrice: "550.00",
    stock: 55,
    unit: "件",
    status: "active",
    imageUrl: null,
    categoryId: null,
  },
];

for (const product of products) {
  try {
    const [result] = await db.insert(schema.products).values(product);
    console.log(`✓ 创建产品: ${product.name} (SKU: ${product.sku})`);
  } catch (error) {
    console.error(`✗ 创建产品失败 ${product.name}:`, error.message);
  }
}

console.log("\n测试产品数据创建完成！");
await connection.end();
process.exit(0);
