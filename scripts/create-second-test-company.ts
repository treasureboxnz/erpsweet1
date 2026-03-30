/**
 * Create second test company and user for multi-tenant testing
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { erpCompanies, users } from "../drizzle/schema";
import { hashPassword } from "../server/utils/password";

async function main() {
  // Connect to database
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  console.log("Creating second test company...");

  // Insert second test company
  const result = await db.insert(erpCompanies).values({
    companyCode: "TEST2",
    companyName: "测试公司2",
    companyNameEn: "Test Company 2",
    email: "test2@example.com",
    phone: "+86 138-0000-0002",
    address: "北京市朝阳区测试大厦2号楼",
    status: "active",
    plan: "free",
  });

  const erpCompanyId = Number(result[0].insertId);
  console.log(`✅ Created company: TEST2 (id=${erpCompanyId})`);

  // Create admin user for second company
  const passwordHash = await hashPassword("admin123");
  
  const userResult = await db.insert(users).values({
    erpCompanyId,
    email: "admin2@test.com",
    name: "管理员2",
    passwordHash,
    role: "admin",
    status: "active",
    mustChangePassword: false,
  });

  const userId = Number(userResult[0].insertId);
  console.log(`✅ Created user: admin2@test.com (id=${userId})`);

  console.log("\n🎉 Second test company created successfully!");
  console.log("\n📋 Login credentials:");
  console.log("  Company Code: TEST2");
  console.log("  Email: admin2@test.com");
  console.log("  Password: admin123");

  await connection.end();
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
