import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

const result = await db.execute(sql`SHOW TABLES LIKE 'quotation_approvals'`);
console.log('Table exists:', result.length > 0);
if (result.length === 0) {
  console.log('Creating table...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quotation_approvals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      quotationId INT NOT NULL,
      approverId INT NOT NULL,
      approverName VARCHAR(100) NOT NULL,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' NOT NULL,
      decision ENUM('approved', 'rejected'),
      comments TEXT,
      decidedAt TIMESTAMP,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      INDEX quotation_approvals_quotation_idx (quotationId),
      INDEX quotation_approvals_approver_idx (approverId),
      INDEX quotation_approvals_status_idx (status),
      FOREIGN KEY (quotationId) REFERENCES quotations(id) ON DELETE CASCADE,
      FOREIGN KEY (approverId) REFERENCES users(id)
    )
  `);
  console.log('Table created successfully');
}
