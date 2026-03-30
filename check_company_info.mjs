import { db } from './server/db.js';
import { erpCompanies } from './drizzle/schema.js';

const companies = await db.select({
  id: erpCompanies.id,
  name: erpCompanies.name,
  marketingCompanyName: erpCompanies.marketingCompanyName,
  marketingEmail: erpCompanies.marketingEmail,
  marketingAddress: erpCompanies.marketingAddress,
  marketingPhone: erpCompanies.marketingPhone,
  marketingWebsite: erpCompanies.marketingWebsite
}).from(erpCompanies);

console.log(JSON.stringify(companies, null, 2));
process.exit(0);
