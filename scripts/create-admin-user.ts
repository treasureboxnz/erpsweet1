/**
 * 创建测试管理员用户
 * 
 * 用户信息：
 * - 邮箱：admin@test.com
 * - 密码：admin123
 * - 角色：admin
 * - 公司：TEST (ID=1)
 */

import { hashPassword } from "../server/utils/password.js";
import { createUser, getUserByEmail } from "../server/db_auth.js";

async function createAdminUser() {
  console.log("🔧 创建测试管理员用户...\n");

  try {
    const email = "admin@test.com";
    const password = "admin123";

    // 检查用户是否已存在
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      console.log(`⚠️  用户已存在：${email}`);
      console.log(`   用户ID：${existingUser.id}`);
      console.log(`   用户名：${existingUser.name}`);
      console.log(`   角色：${existingUser.role}`);
      console.log(`\n✅ 可以使用此账号登录`);
      console.log(`   邮箱：${email}`);
      console.log(`   密码：${password}`);
      console.log(`   公司代码：TEST`);
      return;
    }

    // 创建用户
    const passwordHash = await hashPassword(password);
    const userId = await createUser({
      erpCompanyId: 1, // TEST 公司
      email,
      name: "管理员",
      passwordHash,
      role: "admin",
      mustChangePassword: false,
    });

    console.log(`✅ 管理员用户创建成功！\n`);
    console.log(`📧 邮箱：${email}`);
    console.log(`🔑 密码：${password}`);
    console.log(`🏢 公司代码：TEST`);
    console.log(`👤 角色：admin`);
    console.log(`🆔 用户ID：${userId}\n`);
    console.log(`🌐 现在可以访问 /login 页面登录`);

  } catch (error) {
    console.error("\n❌ 创建用户失败：", error);
    process.exit(1);
  }
}

// 运行脚本
createAdminUser().then(() => {
  console.log("\n✨ 完成！");
  process.exit(0);
}).catch((error) => {
  console.error("\n💥 异常：", error);
  process.exit(1);
});
