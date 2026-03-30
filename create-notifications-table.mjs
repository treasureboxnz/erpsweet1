import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;

async function run() {
  const conn = await createConnection(url);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS in_app_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      erpCompanyId INT NOT NULL,
      recipientId INT NOT NULL,
      senderId INT NOT NULL,
      senderName VARCHAR(200) NOT NULL,
      type ENUM('mention','task','system') NOT NULL DEFAULT 'mention',
      title VARCHAR(500) NOT NULL,
      content TEXT NOT NULL,
      relatedType VARCHAR(50),
      relatedId INT,
      relatedCustomerId INT,
      relatedCustomerName VARCHAR(200),
      isRead TINYINT(1) NOT NULL DEFAULT 0,
      readAt TIMESTAMP NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_recipient (recipientId),
      INDEX idx_erp_company (erpCompanyId),
      INDEX idx_is_read (recipientId, isRead)
    )
  `);
  console.log('Table in_app_notifications created successfully');
  await conn.end();
}

run().catch(console.error);
