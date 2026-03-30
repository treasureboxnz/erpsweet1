import { db } from "./server/db";
import { users, erpCompanies } from "./drizzle/schema";
import { eq } from "drizzle-orm";

const rows = await db
  .select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    hasPassword: users.passwordHash,
    companyName: erpCompanies.companyName,
  })
  .from(users)
  .leftJoin(erpCompanies, eq(users.erpCompanyId, erpCompanies.id))
  .orderBy(erpCompanies.id, users.id);

rows.forEach(r => console.log(JSON.stringify({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  hasPassword: !!r.hasPassword,
  passwordPreview: r.hasPassword ? r.hasPassword.substring(0, 30) + '...' : null,
  company: r.companyName
})));

process.exit(0);
