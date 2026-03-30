// Initialize positions and permissions data
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

// Define positions
const positionsData = [
  {
    name: 'super_admin',
    displayName: '超级管理员',
    description: '系统最高权限，可以管理所有功能和用户',
    isSystem: true,
  },
  {
    name: 'admin',
    displayName: '管理员',
    description: '管理员权限，可以管理大部分功能',
    isSystem: true,
  },
  {
    name: 'operator',
    displayName: '操作员',
    description: '基础操作权限',
    isSystem: true,
  },
  {
    name: 'manager',
    displayName: '经理',
    description: '部门经理，拥有较高的业务权限',
    isSystem: false,
  },
  {
    name: 'inspector',
    displayName: '验货员',
    description: '负责产品验货和质量检查',
    isSystem: false,
  },
  {
    name: 'purchaser',
    displayName: '采购',
    description: '负责采购管理',
    isSystem: false,
  },
  {
    name: 'finance',
    displayName: '财务',
    description: '负责财务管理',
    isSystem: false,
  },
];

// Define modules
const modules = [
  'customer_management',
  'product_management',
  'order_management',
  'report_center',
  'user_management',
  'operation_logs',
];

// Define default permissions for each position
const defaultPermissions = {
  super_admin: {
    customer_management: ['all'],
    product_management: ['all'],
    order_management: ['all'],
    report_center: ['all'],
    user_management: ['all'],
    operation_logs: ['all'],
  },
  admin: {
    customer_management: ['all'],
    product_management: ['all'],
    order_management: ['all'],
    report_center: ['all'],
    user_management: ['all'],
    operation_logs: ['all'],
  },
  operator: {
    customer_management: ['read', 'write'],
    product_management: ['read', 'write'],
    order_management: ['read', 'write'],
    report_center: ['read', 'download'],
    user_management: [],
    operation_logs: ['read'],
  },
  manager: {
    customer_management: ['all'],
    product_management: ['all'],
    order_management: ['all'],
    report_center: ['all'],
    user_management: ['read'],
    operation_logs: ['read'],
  },
  inspector: {
    customer_management: ['read'],
    product_management: ['read', 'write'],
    order_management: ['read', 'write'],
    report_center: ['read'],
    user_management: [],
    operation_logs: ['read'],
  },
  purchaser: {
    customer_management: ['read'],
    product_management: ['all'],
    order_management: ['read', 'write'],
    report_center: ['read', 'download'],
    user_management: [],
    operation_logs: ['read'],
  },
  finance: {
    customer_management: ['read'],
    product_management: ['read'],
    order_management: ['all'],
    report_center: ['all'],
    user_management: [],
    operation_logs: ['read'],
  },
};

try {
  console.log('Starting initialization...');

  // Insert positions
  console.log('Inserting positions...');
  for (const position of positionsData) {
    const [result] = await connection.execute(
      'INSERT INTO positions (name, displayName, description, isSystem) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE displayName = VALUES(displayName), description = VALUES(description)',
      [position.name, position.displayName, position.description, position.isSystem]
    );
    console.log(`  ✓ Position: ${position.displayName}`);
  }

  // Get position IDs
  const [positions] = await connection.execute('SELECT id, name FROM positions');
  const positionMap = {};
  positions.forEach((p) => {
    positionMap[p.name] = p.id;
  });

  // Insert permissions
  console.log('Inserting permissions...');
  for (const [positionName, modulePermissions] of Object.entries(defaultPermissions)) {
    const positionId = positionMap[positionName];
    if (!positionId) {
      console.warn(`  ⚠ Position ${positionName} not found, skipping...`);
      continue;
    }

    for (const [module, permissionTypes] of Object.entries(modulePermissions)) {
      for (const permissionType of permissionTypes) {
        await connection.execute(
          'INSERT INTO permissions (positionId, module, permissionType) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE updatedAt = CURRENT_TIMESTAMP',
          [positionId, module, permissionType]
        );
      }
    }
    console.log(`  ✓ Permissions for: ${positionName}`);
  }

  console.log('✅ Initialization completed successfully!');
} catch (error) {
  console.error('❌ Error during initialization:', error);
  process.exit(1);
} finally {
  await connection.end();
}
