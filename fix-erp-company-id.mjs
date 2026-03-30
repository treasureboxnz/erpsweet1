/**
 * This script identifies all insert operations missing erpCompanyId
 * and provides the fix locations. We'll fix them manually per file.
 */

// Files and line numbers that need erpCompanyId added to insert operations:
const fixes = [
  // server/_core/oauth.ts - user upsert
  { file: "server/_core/oauth.ts", line: 43, desc: "user upsert missing erpCompanyId" },
  // server/_core/sdk.ts - user upsert  
  { file: "server/_core/sdk.ts", lines: [277, 295], desc: "user creation missing erpCompanyId" },
  // server/customerManagement.ts - customer/contact inserts
  { file: "server/customerManagement.ts", lines: [382, 538, 624, 714], desc: "customer operations" },
  // server/db.ts - various inserts
  { file: "server/db.ts", lines: [33, 737, 972, 1062, 1179], desc: "db helper inserts" },
  // server/orders.ts - order status history
  { file: "server/orders.ts", lines: [295, 403, 468], desc: "order status history inserts" },
  // server/productVariants.ts - variant operations
  { file: "server/productVariants.ts", lines: [560, 568, 870, 925, 944, 973, 1026, 1127], desc: "variant operations" },
  // server/routers/apollo.ts - apollo candidate inserts
  { file: "server/routers/apollo.ts", lines: [26, 706, 965, 1168], desc: "apollo operations" },
  // server/routers/attributes.ts - attribute inserts
  { file: "server/routers/attributes.ts", lines: [50, 101], desc: "attribute inserts" },
  // server/routers/categories.ts - category inserts
  { file: "server/routers/categories.ts", line: 42, desc: "category insert" },
  // server/routers/customerManagement.ts - customer insert
  { file: "server/routers/customerManagement.ts", line: 139, desc: "customer insert" },
  // server/routers/productImages.ts - image inserts
  { file: "server/routers/productImages.ts", lines: [64, 174], desc: "product image inserts" },
  // server/routers/quotations.ts - quotation operations
  { file: "server/routers/quotations.ts", lines: [169, 654, 991, 1009], desc: "quotation operations" },
  // server/routers/tags.ts - tag insert
  { file: "server/routers/tags.ts", line: 35, desc: "tag insert" },
  // server/routers/userManagement.ts - invitation insert
  { file: "server/routers/userManagement.ts", line: 265, desc: "invitation insert" },
  // server/tags.ts - tag operations
  { file: "server/tags.ts", lines: [143, 175], desc: "tag operations" },
  // server/variantMaterials.ts - material inserts
  { file: "server/variantMaterials.ts", lines: [76, 203], desc: "variant material inserts" },
];

console.log("Total files to fix:", fixes.length);
console.log("Total error locations:", fixes.reduce((sum, f) => sum + (f.lines ? f.lines.length : 1), 0));
