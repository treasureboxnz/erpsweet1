/**
 * 后端认证 API 测试脚本
 * 
 * 测试流程：
 * 1. 验证公司代码
 * 2. 创建测试用户
 * 3. 登录
 * 4. 获取当前用户信息
 * 5. 修改密码
 * 6. 重置密码（管理员操作）
 * 7. 删除用户
 */

import { hashPassword } from "./server/utils/password.js";
import { createUser, getUserByEmail, getErpCompanyByCode } from "./server/db_auth.js";

async function testAuthAPI() {
  console.log("🧪 开始测试后端认证 API...\n");

  try {
    // 1. 测试：验证公司代码
    console.log("1️⃣ 测试：验证公司代码");
    const company = await getErpCompanyByCode("TEST");
    if (!company) {
      throw new Error("❌ 公司代码 TEST 不存在");
    }
    console.log(`✅ 公司代码验证成功：${company.companyName} (ID: ${company.id})\n`);

    // 2. 测试：创建测试用户
    console.log("2️⃣ 测试：创建测试用户");
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = "test123456";
    const passwordHash = await hashPassword(testPassword);

    const userId = await createUser({
      erpCompanyId: company.id,
      email: testEmail,
      name: "测试用户",
      passwordHash,
      role: "operator",
      mustChangePassword: false,
    });
    console.log(`✅ 用户创建成功：${testEmail} (ID: ${userId})\n`);

    // 3. 测试：查询用户
    console.log("3️⃣ 测试：查询用户");
    const user = await getUserByEmail(testEmail);
    if (!user) {
      throw new Error("❌ 查询用户失败");
    }
    console.log(`✅ 用户查询成功：${user.name} (${user.email})\n`);

    // 4. 测试：验证密码
    console.log("4️⃣ 测试：验证密码");
    const { verifyPassword } = await import("./server/utils/password.js");
    const isPasswordValid = await verifyPassword(testPassword, user.passwordHash!);
    if (!isPasswordValid) {
      throw new Error("❌ 密码验证失败");
    }
    console.log(`✅ 密码验证成功\n`);

    // 5. 测试：创建 Session
    console.log("5️⃣ 测试：创建 Session");
    const { createSession, verifySession } = await import("./server/utils/session.js");
    const token = createSession({
      userId: user.id,
      erpCompanyId: company.id,
      email: user.email!,
      role: user.role,
    });
    console.log(`✅ Session Token 创建成功：${token.substring(0, 50)}...\n`);

    // 6. 测试：验证 Session
    console.log("6️⃣ 测试：验证 Session");
    const sessionData = verifySession(token);
    if (!sessionData) {
      throw new Error("❌ Session 验证失败");
    }
    console.log(`✅ Session 验证成功：用户ID=${sessionData.userId}, 公司ID=${sessionData.erpCompanyId}\n`);

    // 7. 测试：修改密码
    console.log("7️⃣ 测试：修改密码");
    const newPassword = "newpassword123";
    const newPasswordHash = await hashPassword(newPassword);
    const { updateUserPassword } = await import("./server/db_auth.js");
    await updateUserPassword(user.id, newPasswordHash);
    
    // 验证新密码
    const updatedUser = await getUserByEmail(testEmail);
    const isNewPasswordValid = await verifyPassword(newPassword, updatedUser!.passwordHash!);
    if (!isNewPasswordValid) {
      throw new Error("❌ 新密码验证失败");
    }
    console.log(`✅ 密码修改成功\n`);

    // 8. 测试：删除用户
    console.log("8️⃣ 测试：删除用户");
    const { deleteUser } = await import("./server/db_auth.js");
    await deleteUser(user.id);
    
    // 验证用户已删除
    const deletedUser = await getUserByEmail(testEmail);
    if (deletedUser) {
      throw new Error("❌ 用户删除失败");
    }
    console.log(`✅ 用户删除成功\n`);

    console.log("🎉 所有测试通过！\n");
    console.log("📊 测试总结：");
    console.log("  ✅ 公司代码验证");
    console.log("  ✅ 创建用户");
    console.log("  ✅ 查询用户");
    console.log("  ✅ 密码验证");
    console.log("  ✅ Session 创建");
    console.log("  ✅ Session 验证");
    console.log("  ✅ 修改密码");
    console.log("  ✅ 删除用户");

  } catch (error) {
    console.error("\n❌ 测试失败：", error);
    process.exit(1);
  }
}

// 运行测试
testAuthAPI().then(() => {
  console.log("\n✨ 测试完成！");
  process.exit(0);
}).catch((error) => {
  console.error("\n💥 测试异常：", error);
  process.exit(1);
});
