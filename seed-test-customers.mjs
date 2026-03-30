import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

// 测试客户数据
const testCompanies = [
  { name: "TechVision Solutions", country: "United States", city: "San Francisco", type: "direct", status: "cooperating" },
  { name: "Global Trade Partners", country: "United Kingdom", city: "London", type: "distributor", status: "cooperating" },
  { name: "Pacific Imports Ltd", country: "Australia", city: "Sydney", type: "agent", status: "developing" },
  { name: "Euro Commerce GmbH", country: "Germany", city: "Berlin", type: "direct", status: "cooperating" },
  { name: "Asia Pacific Trading", country: "Singapore", city: "Singapore", type: "distributor", status: "developing" },
  { name: "Nordic Supplies AB", country: "Sweden", city: "Stockholm", type: "retailer", status: "cooperating" },
  { name: "Mediterranean Exports", country: "Spain", city: "Barcelona", type: "agent", status: "developing" },
  { name: "Canadian Wholesale Co", country: "Canada", city: "Toronto", type: "distributor", status: "cooperating" },
  { name: "Tokyo Business Group", country: "Japan", city: "Tokyo", type: "direct", status: "developing" },
  { name: "Dubai Trade Center", country: "UAE", city: "Dubai", type: "distributor", status: "cooperating" },
  { name: "South American Imports", country: "Brazil", city: "São Paulo", type: "agent", status: "developing" },
  { name: "Alpine Trading AG", country: "Switzerland", city: "Zurich", type: "direct", status: "stopped" },
  { name: "Benelux Distribution", country: "Netherlands", city: "Amsterdam", type: "distributor", status: "cooperating" },
  { name: "Scandinavian Partners", country: "Norway", city: "Oslo", type: "retailer", status: "developing" },
  { name: "French Connection SARL", country: "France", city: "Paris", type: "agent", status: "cooperating" },
  { name: "Italian Trade House", country: "Italy", city: "Milan", type: "direct", status: "developing" },
  { name: "Korean Business Corp", country: "South Korea", city: "Seoul", type: "distributor", status: "cooperating" },
  { name: "Mexican Imports SA", country: "Mexico", city: "Mexico City", type: "agent", status: "stopped" },
  { name: "New Zealand Trading", country: "New Zealand", city: "Auckland", type: "direct", status: "developing" },
  { name: "Hong Kong Enterprises", country: "Hong Kong", city: "Hong Kong", type: "distributor", status: "cooperating" }
];

// 联系人名字库
const firstNames = ["John", "Sarah", "Michael", "Emma", "David", "Lisa", "James", "Maria", "Robert", "Anna", "William", "Sophie", "Thomas", "Emily", "Daniel", "Olivia", "Richard", "Isabella", "Charles", "Mia"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
const positions = ["CEO", "Sales Manager", "Purchasing Manager", "Operations Director", "Marketing Director", "CFO", "VP Sales", "Account Manager", "Business Development Manager", "General Manager"];
const departments = ["Sales", "Purchasing", "Operations", "Marketing", "Finance", "Management", "Business Development"];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEmail(firstName, lastName, companyName) {
  const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + ".com";
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function generatePhone() {
  const codes = ["+1", "+44", "+61", "+49", "+65", "+46", "+34", "+81", "+971", "+55", "+41", "+31", "+47", "+33", "+39", "+82", "+52", "+64", "+852"];
  return `${randomElement(codes)}-${Math.floor(100000000 + Math.random() * 900000000)}`;
}

async function seedData() {
  console.log("🌱 开始生成测试数据...");

  for (const company of testCompanies) {
    try {
      // 插入公司
      const [companyResult] = await db.insert(schema.companies).values({
        companyName: company.name,
        customerCode: `CUST-${Math.floor(10000 + Math.random() * 90000)}`,
        customerType: company.type,
        cooperationStatus: company.status,
        importance: randomElement(["vip", "high", "medium", "low"]),
        country: company.country,
        city: company.city,
        website: `www.${company.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        notes: `Test customer data for ${company.name}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const companyId = companyResult.insertId;
      console.log(`✅ 创建公司: ${company.name} (ID: ${companyId})`);

      // 为每个公司创建1-5个联系人
      const contactCount = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < contactCount; i++) {
        const firstName = randomElement(firstNames);
        const lastName = randomElement(lastNames);
        const email = generateEmail(firstName, lastName, company.name);
        
        const [contactResult] = await db.insert(schema.contacts).values({
          fullName: `${firstName} ${lastName}`,
          firstName: firstName,
          lastName: lastName,
          jobTitle: randomElement(positions),
          department: randomElement(departments),
          email: email,
          phone: generatePhone(),
          importance: randomElement(["key", "normal", "secondary"]),
          notes: `Contact person for ${company.name}`,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // 关联联系人和公司
        await db.insert(schema.companyContacts).values({
          companyId: companyId,
          contactId: contactResult.insertId,
          isPrimary: i === 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`  📇 创建联系人: ${firstName} ${lastName} (${i + 1}/${contactCount})`);
      }

      // 为部分公司创建跟进记录
      if (Math.random() > 0.5) {
        await db.insert(schema.followUpRecords).values({
          companyId: companyId,
          followUpType: randomElement(["phone", "email", "meeting", "visit"]),
          content: `Initial contact with ${company.name}. Discussed potential collaboration opportunities.`,
          nextFollowUpDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`  📝 创建跟进记录`);
      }

    } catch (error) {
      console.error(`❌ 创建 ${company.name} 失败:`, error.message);
    }
  }

  console.log("\n✨ 测试数据生成完成！");
  await connection.end();
}

seedData().catch((error) => {
  console.error("❌ 错误:", error);
  process.exit(1);
});
