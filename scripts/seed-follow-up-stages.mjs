import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DB_URL);

// 跟进阶段选项（现跟进阶段 + 下部工作计划共用）
const followUpStages = [
  "每周newsletter",
  "客户询问图册或者newsletter款式沟通询价",
  "客户选款询价",
  "业务初次报价",
  "多次互动-款式及报价",
  "已报价但客户沉默",
  "样品洽谈",
  "具体款式洽谈订单",
  "签单",
];

// 下部工作计划额外选项
const nextPlanExtraStages = [
  "无计划-客户流失",
];

const allStages = [
  ...followUpStages.map((name, i) => ({
    name,
    category: "客户管理",
    subcategory: "跟进管理",
    fieldName: "跟进阶段",
    displayOrder: i + 1,
  })),
  ...nextPlanExtraStages.map((name, i) => ({
    name,
    category: "客户管理",
    subcategory: "跟进管理",
    fieldName: "工作计划",
    displayOrder: followUpStages.length + i + 1,
  })),
];

// Also add "跟进阶段" entries as "工作计划" (they share the same list except the extra one)
const workPlanStages = followUpStages.map((name, i) => ({
  name,
  category: "客户管理",
  subcategory: "跟进管理",
  fieldName: "工作计划",
  displayOrder: i + 1,
}));

const toInsert = [...allStages, ...workPlanStages];

for (const stage of toInsert) {
  // Check if already exists
  const [existing] = await connection.execute(
    "SELECT id FROM attributes WHERE category = ? AND subcategory = ? AND fieldName = ? AND name = ? LIMIT 1",
    [stage.category, stage.subcategory, stage.fieldName, stage.name]
  );
  if (existing.length === 0) {
    await connection.execute(
      "INSERT INTO attributes (name, category, subcategory, fieldName, displayOrder) VALUES (?, ?, ?, ?, ?)",
      [stage.name, stage.category, stage.subcategory, stage.fieldName, stage.displayOrder]
    );
    console.log(`Inserted: [${stage.fieldName}] ${stage.name}`);
  } else {
    console.log(`Already exists: [${stage.fieldName}] ${stage.name}`);
  }
}

await connection.end();
console.log("Done!");
