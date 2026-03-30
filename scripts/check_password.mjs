import bcrypt from 'bcryptjs';

const hash = '$2b$10$ZUyTeKy3H.YlDhveFX2/5u1yfDLfM9FkMcNr2rS9AV8iPUJLdLnDy';
const passwords = ['Admin1234!', 'admin123', 'Admin123', 'admin1234', 'test123', 'Test1234!', '123456'];

for (const pwd of passwords) {
  const match = await bcrypt.compare(pwd, hash);
  if (match) {
    console.log('MATCH:', pwd);
    break;
  }
}
console.log('Done');
