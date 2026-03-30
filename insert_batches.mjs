#!/usr/bin/env node
import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

async function main() {
  const connection = await createConnection(DATABASE_URL);
  
  console.log('Connected to database');
  
  // Read SQL file
  const sqlContent = readFileSync('/home/ubuntu/batch_inserts.sql', 'utf-8');
  
  // Split into individual statements
  const statements = sqlContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('--'))
    .join('\n')
    .split(');')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0)
    .map(stmt => stmt + ');');
  
  console.log(`Found ${statements.length} SQL statements to execute`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await connection.execute(stmt);
      successCount++;
      if ((i + 1) % 10 === 0) {
        console.log(`Progress: ${i + 1}/${statements.length} statements executed`);
      }
    } catch (error) {
      errorCount++;
      console.error(`Error executing statement ${i + 1}:`, error.message);
      console.error('Statement:', stmt.substring(0, 100) + '...');
    }
  }
  
  console.log(`\nCompleted:`);
  console.log(`- Success: ${successCount}`);
  console.log(`- Errors: ${errorCount}`);
  
  await connection.end();
}

main().catch(console.error);
