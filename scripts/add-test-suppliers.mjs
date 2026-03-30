import { drizzle } from 'drizzle-orm/mysql2';
import { suppliers } from '../drizzle/schema.ts';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const db = drizzle(connectionString);

const testSuppliers = [
  {
    name: '广州家具制造厂',
    contactPerson: '李总',
    phone: '13800138001',
    email: 'li@gzfurniture.com',
    address: '广州市白云区工业园',
    status: 'active',
  },
  {
    name: '佛山木业有限公司',
    contactPerson: '王经理',
    phone: '13800138002',
    email: 'wang@fswoodwork.com',
    address: '佛山市顺德区龙江镇',
    status: 'active',
  },
  {
    name: '东莞五金配件厂',
    contactPerson: '张主任',
    phone: '13800138003',
    email: 'zhang@dghardware.com',
    address: '东莞市长安镇',
    status: 'active',
  },
  {
    name: '中山灯具制造商',
    contactPerson: '刘总',
    phone: '13800138004',
    email: 'liu@zslighting.com',
    address: '中山市古镇',
    status: 'active',
  },
  {
    name: '上海纺织品供应商',
    contactPerson: '陈经理',
    phone: '13800138005',
    email: 'chen@shtextile.com',
    address: '上海市松江区',
    status: 'active',
  },
  {
    name: '杭州丝绸厂',
    contactPerson: '周总',
    phone: '13800138006',
    email: 'zhou@hzsilk.com',
    address: '杭州市余杭区',
    status: 'active',
  },
  {
    name: '宁波塑料制品厂',
    contactPerson: '吴经理',
    phone: '13800138007',
    email: 'wu@nbplastic.com',
    address: '宁波市北仑区',
    status: 'active',
  },
  {
    name: '苏州电子元件供应商',
    contactPerson: '郑主任',
    phone: '13800138008',
    email: 'zheng@szelectronics.com',
    address: '苏州市工业园区',
    status: 'active',
  },
  {
    name: '温州皮革制品厂',
    contactPerson: '赵总',
    phone: '13800138009',
    email: 'zhao@wzleather.com',
    address: '温州市龙湾区',
    status: 'active',
  },
  {
    name: '义乌小商品批发商',
    contactPerson: '孙经理',
    phone: '13800138010',
    email: 'sun@ywgoods.com',
    address: '义乌市国际商贸城',
    status: 'active',
  },
];

async function main() {
  console.log('开始添加测试供应商...');
  
  for (const supplier of testSuppliers) {
    try {
      await db.insert(suppliers).values(supplier);
      console.log(`✅ 已添加供应商: ${supplier.name}`);
    } catch (error) {
      console.error(`❌ 添加供应商失败 ${supplier.name}:`, error.message);
    }
  }
  
  console.log('✅ 所有测试供应商添加完成！');
  process.exit(0);
}

main().catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
