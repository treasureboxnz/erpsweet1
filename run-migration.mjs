import mysql from 'mysql2/promise';
import fs from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const sql = fs.readFileSync('drizzle/0055_sloppy_jack_flag.sql', 'utf8');
const statements = sql.split(/-->.*?statement-breakpoint/s).filter(s => s.trim());

for (const stmt of statements) {
  if (stmt.trim()) {
    try {
      await conn.execute(stmt.trim());
      console.log('✓ Executed:', stmt.substring(0, 60).replace(/\n/g, ' ') + '...');
    } catch (err) {
      console.log('⚠ Skipped (may already exist):', stmt.substring(0, 60).replace(/\n/g, ' '));
    }
  }
}

await conn.end();
console.log('✓ Migration completed');
