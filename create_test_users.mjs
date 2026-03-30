/**
 * 为TEST和TEST2公司创建测试用户
 */
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

async function createTestUsers() {
  try {
    console.log('开始创建测试用户...');
    
    // 生成密码哈希
    const passwordHash = await bcrypt.hash('password123', 10);
    console.log('密码哈希生成成功');
    
    // 查询TEST和TEST2公司的ID
    const [companies] = await connection.execute(
      'SELECT id, companyCode, companyName FROM erp_companies WHERE companyCode IN (?, ?)',
      ['TEST', 'TEST2']
    );
    
    console.log('找到的公司:', companies);
    
    for (const company of companies) {
      const email = `admin@${company.companyCode.toLowerCase()}.com`;
      
      // 检查用户是否已存在
      const [existingUsers] = await connection.execute(
        'SELECT id, email FROM users WHERE email = ?',
        [email]
      );
      
      if (existingUsers.length > 0) {
        console.log(`用户 ${email} 已存在，更新密码...`);
        await connection.execute(
          'UPDATE users SET passwordHash = ?, mustChangePassword = 0 WHERE email = ?',
          [passwordHash, email]
        );
        console.log(`✅ 用户 ${email} 密码已更新`);
      } else {
        console.log(`创建新用户 ${email}...`);
        await connection.execute(
          `INSERT INTO users (email, name, passwordHash, role, erpCompanyId, mustChangePassword, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [email, `${company.companyName}管理员`, passwordHash, 'admin', company.id, 0]
        );
        console.log(`✅ 用户 ${email} 创建成功`);
      }
    }
    
    console.log('\n所有测试用户创建/更新完成！');
    console.log('\n登录信息：');
    console.log('TEST公司: admin@test.com / password123');
    console.log('TEST2公司: admin@test2.com / password123');
    
  } catch (error) {
    console.error('创建用户失败:', error);
  } finally {
    await connection.end();
  }
}

createTestUsers();
