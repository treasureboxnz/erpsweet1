import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
const conn = await mysql.createConnection(url);

const [rows] = await conn.query(`
  SELECT 
    c.id, c.companyName, c.country, c.city, c.state, c.address, c.postalCode,
    cl.id as letterheadId,
    cl.companyNameEn, cl.addressEn, cl.cityEn, cl.stateEn, cl.postalCode as clPostalCode, cl.countryEn
  FROM companies c
  LEFT JOIN company_letterheads cl ON cl.companyId = c.id
  WHERE c.id < 60000
  ORDER BY c.id
`);

// 过滤掉明显的测试数据，只保留真实业务客户
const realCustomers = rows.filter(r => {
  const name = r.companyName || '';
  if (name.toLowerCase().startsWith('test')) return false;
  if (name.toLowerCase().startsWith('ui test')) return false;
  if (name.toLowerCase().includes('tester')) return false;
  return true;
});

// 找出缺少英文信息的客户
const missing = realCustomers.filter(r => !r.companyNameEn);

console.log('Total real customers:', realCustomers.length);
console.log('Missing EN info:', missing.length);
console.log('Already have EN info:', realCustomers.length - missing.length);
console.log('\n=== MISSING EN INFO ===');
missing.forEach(r => {
  console.log(JSON.stringify({
    id: r.id,
    companyName: r.companyName,
    country: r.country,
    city: r.city,
    state: r.state,
    address: r.address,
    postalCode: r.postalCode,
    letterheadId: r.letterheadId
  }));
});

await conn.end();
