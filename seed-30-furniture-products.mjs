import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import * as schema from './drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// 24 uploaded image URLs from S3
const imageUrls = [
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/jTGWCHvTxrcrWQBk.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/dxaLIDKyyMiVDyHu.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/tTyiztzuUrtkikEW.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/uXVokFZWVsqZADgH.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/cglgffAxJtFwAFgx.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/oAydMcRFCPXQHKGI.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/ldSNNHPNVbcERbqa.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/vyUcaCXAjRwxAtzk.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/qAcxrTNTzyFPlVZj.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/eXSwxuPzoANKziup.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/CyVQiqoPYGTThDUD.webp",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/GVevmiBCURRrWJSr.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/QwlBdTRtoBAXKtEk.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/gddSRGAilCsgyhoo.webp",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/LREPGmOECpGnMpUa.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/eJRgJEJUNmRfvEpF.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/nGIRUNOddXFyAfXb.png",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/UgSeGpszFKWdmaBC.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/hEoqlRbjvGCYmpJo.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/QNXiWfzfSufwpWUV.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/InojKeLAmHzPLPiU.webp",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/NaSRocFCjuLAvtnM.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/FUOzABWuUXJBiPUF.jpg",
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/AHrxwYRiMHSIqBPe.webp",
];

// 30 furniture products with English names
const products = [
  {
    name: "Modern Minimalist Sofa",
    sku: "SF-2001",
    description: "Contemporary 3-seater sofa with clean lines and comfortable cushions, perfect for modern living rooms.",
    category: "Living Room",
    costPrice: "1280.00",
    sellingPrice: "2560.00",
    imageUrl: imageUrls[0],
    productionMode: "make_to_order"
  },
  {
    name: "Scandinavian Coffee Table",
    sku: "CT-2002",
    description: "Solid wood coffee table with mid-century modern design, featuring a lower shelf for storage.",
    category: "Living Room",
    costPrice: "420.00",
    sellingPrice: "840.00",
    imageUrl: imageUrls[1],
    productionMode: "make_to_order"
  },
  {
    name: "Executive Office Desk",
    sku: "OD-2003",
    description: "Spacious L-shaped executive desk with built-in cable management and premium finish.",
    category: "Office Furniture",
    costPrice: "980.00",
    sellingPrice: "1960.00",
    imageUrl: imageUrls[2],
    productionMode: "make_to_order"
  },
  {
    name: "Ergonomic Office Chair",
    sku: "OC-2004",
    description: "High-back ergonomic chair with lumbar support, adjustable armrests, and breathable mesh.",
    category: "Office Furniture",
    costPrice: "320.00",
    sellingPrice: "640.00",
    imageUrl: imageUrls[3],
    productionMode: "make_to_order"
  },
  {
    name: "Industrial Bookshelf",
    sku: "BS-2005",
    description: "5-tier open bookshelf with metal frame and wood shelves, industrial style design.",
    category: "Office Furniture",
    costPrice: "280.00",
    sellingPrice: "560.00",
    imageUrl: imageUrls[4],
    productionMode: "make_to_order"
  },
  {
    name: "Dining Table Set",
    sku: "DT-2006",
    description: "6-person dining table with matching chairs, solid wood construction with modern design.",
    category: "Dining Room",
    costPrice: "1100.00",
    sellingPrice: "2200.00",
    imageUrl: imageUrls[5],
    productionMode: "make_to_order"
  },
  {
    name: "Upholstered Dining Chair",
    sku: "DC-2007",
    description: "Comfortable dining chair with button-tufted backrest and solid wood legs.",
    category: "Dining Room",
    costPrice: "180.00",
    sellingPrice: "360.00",
    imageUrl: imageUrls[6],
    productionMode: "make_to_order"
  },
  {
    name: "Queen Size Platform Bed",
    sku: "BD-2008",
    description: "Modern platform bed with upholstered headboard and sturdy slat support system.",
    category: "Bedroom",
    costPrice: "720.00",
    sellingPrice: "1440.00",
    imageUrl: imageUrls[7],
    productionMode: "make_to_order"
  },
  {
    name: "Wardrobe with Sliding Doors",
    sku: "WD-2009",
    description: "Large wardrobe with sliding mirror doors, multiple compartments and hanging space.",
    category: "Bedroom",
    costPrice: "1380.00",
    sellingPrice: "2760.00",
    imageUrl: imageUrls[8],
    productionMode: "make_to_order"
  },
  {
    name: "Nightstand with Drawers",
    sku: "NS-2010",
    description: "Compact nightstand with 2 drawers and open shelf, perfect bedside storage solution.",
    category: "Bedroom",
    costPrice: "160.00",
    sellingPrice: "320.00",
    imageUrl: imageUrls[9],
    productionMode: "make_to_order"
  },
  {
    name: "Accent Armchair",
    sku: "AC-2011",
    description: "Stylish accent chair with curved armrests and plush cushioning, ideal for reading nooks.",
    category: "Living Room",
    costPrice: "480.00",
    sellingPrice: "960.00",
    imageUrl: imageUrls[10],
    productionMode: "make_to_order"
  },
  {
    name: "TV Stand with Storage",
    sku: "TV-2012",
    description: "Modern TV console with cable management, drawers, and open shelving for media devices.",
    category: "Living Room",
    costPrice: "520.00",
    sellingPrice: "1040.00",
    imageUrl: imageUrls[11],
    productionMode: "make_to_order"
  },
  {
    name: "Console Table",
    sku: "CS-2013",
    description: "Narrow console table with metal base and wood top, perfect for entryways.",
    category: "Living Room",
    costPrice: "340.00",
    sellingPrice: "680.00",
    imageUrl: imageUrls[12],
    productionMode: "make_to_order"
  },
  {
    name: "Bar Stool Set",
    sku: "BS-2014",
    description: "Set of 2 adjustable bar stools with footrest and swivel seat, modern design.",
    category: "Dining Room",
    costPrice: "260.00",
    sellingPrice: "520.00",
    imageUrl: imageUrls[13],
    productionMode: "make_to_order"
  },
  {
    name: "Sideboard Cabinet",
    sku: "SB-2015",
    description: "Elegant sideboard with 3 doors and interior shelving, ideal for dining room storage.",
    category: "Dining Room",
    costPrice: "880.00",
    sellingPrice: "1760.00",
    imageUrl: imageUrls[14],
    productionMode: "make_to_order"
  },
  {
    name: "Dresser with Mirror",
    sku: "DR-2016",
    description: "6-drawer dresser with matching wall mirror, classic bedroom furniture piece.",
    category: "Bedroom",
    costPrice: "760.00",
    sellingPrice: "1520.00",
    imageUrl: imageUrls[15],
    productionMode: "make_to_order"
  },
  {
    name: "Storage Ottoman",
    sku: "OT-2017",
    description: "Multifunctional ottoman with hidden storage and tufted top, serves as seating or footrest.",
    category: "Living Room",
    costPrice: "220.00",
    sellingPrice: "440.00",
    imageUrl: imageUrls[16],
    productionMode: "make_to_order"
  },
  {
    name: "Corner Desk",
    sku: "CD-2018",
    description: "Space-saving corner desk with keyboard tray and CPU stand, ideal for home offices.",
    category: "Office Furniture",
    costPrice: "420.00",
    sellingPrice: "840.00",
    imageUrl: imageUrls[17],
    productionMode: "make_to_order"
  },
  {
    name: "File Cabinet",
    sku: "FC-2019",
    description: "3-drawer mobile file cabinet with lock, fits under most desks for easy access.",
    category: "Office Furniture",
    costPrice: "280.00",
    sellingPrice: "560.00",
    imageUrl: imageUrls[18],
    productionMode: "make_to_order"
  },
  {
    name: "Marble Side Table",
    sku: "ST-2020",
    description: "Elegant side table with marble top and gold metal base, perfect accent piece.",
    category: "Living Room",
    costPrice: "380.00",
    sellingPrice: "760.00",
    imageUrl: imageUrls[19],
    productionMode: "make_to_order"
  },
  {
    name: "Bedroom Set Complete",
    sku: "BS-2021",
    description: "Complete bedroom furniture set including bed, nightstands, dresser, and wardrobe.",
    category: "Bedroom",
    costPrice: "3200.00",
    sellingPrice: "6400.00",
    imageUrl: imageUrls[20],
    productionMode: "make_to_order"
  },
  {
    name: "Writing Desk with Hutch",
    sku: "WD-2022",
    description: "Compact writing desk with overhead hutch for books and supplies, student-friendly design.",
    category: "Office Furniture",
    costPrice: "560.00",
    sellingPrice: "1120.00",
    imageUrl: imageUrls[21],
    productionMode: "make_to_order"
  },
  {
    name: "Round Dining Table",
    sku: "RD-2023",
    description: "Round pedestal dining table seats 4-6 people, space-efficient design.",
    category: "Dining Room",
    costPrice: "680.00",
    sellingPrice: "1360.00",
    imageUrl: imageUrls[22],
    productionMode: "make_to_order"
  },
  {
    name: "Bunk Bed with Ladder",
    sku: "BB-2024",
    description: "Twin-over-twin bunk bed with safety rails and sturdy ladder, perfect for kids' rooms.",
    category: "Bedroom",
    costPrice: "920.00",
    sellingPrice: "1840.00",
    imageUrl: imageUrls[23],
    productionMode: "make_to_order"
  },
  {
    name: "Sectional Sofa L-Shape",
    sku: "SS-2025",
    description: "Large L-shaped sectional sofa with chaise lounge, seats 6-8 people comfortably.",
    category: "Living Room",
    costPrice: "2100.00",
    sellingPrice: "4200.00",
    imageUrl: imageUrls[0], // Reuse image
    productionMode: "make_to_order"
  },
  {
    name: "Recliner Chair",
    sku: "RC-2026",
    description: "Comfortable reclining chair with footrest and lumbar support, upholstered in premium fabric.",
    category: "Living Room",
    costPrice: "640.00",
    sellingPrice: "1280.00",
    imageUrl: imageUrls[1], // Reuse image
    productionMode: "make_to_order"
  },
  {
    name: "Standing Desk Adjustable",
    sku: "SD-2027",
    description: "Electric height-adjustable standing desk with memory presets and cable tray.",
    category: "Office Furniture",
    costPrice: "780.00",
    sellingPrice: "1560.00",
    imageUrl: imageUrls[2], // Reuse image
    productionMode: "make_to_order"
  },
  {
    name: "Bench with Storage",
    sku: "BN-2028",
    description: "Entryway bench with lift-top storage and cushioned seat, functional and stylish.",
    category: "Living Room",
    costPrice: "320.00",
    sellingPrice: "640.00",
    imageUrl: imageUrls[3], // Reuse image
    productionMode: "make_to_order"
  },
  {
    name: "Glass Display Cabinet",
    sku: "GD-2029",
    description: "Tall display cabinet with glass doors and interior lighting, showcase your collectibles.",
    category: "Living Room",
    costPrice: "960.00",
    sellingPrice: "1920.00",
    imageUrl: imageUrls[4], // Reuse image
    productionMode: "make_to_order"
  },
  {
    name: "Kids Study Desk",
    sku: "KD-2030",
    description: "Height-adjustable study desk for children with tilting desktop and storage drawer.",
    category: "Office Furniture",
    costPrice: "380.00",
    sellingPrice: "760.00",
    imageUrl: imageUrls[5], // Reuse image
    productionMode: "make_to_order"
  },
];

console.log("Creating 30 furniture products...");

// Get or create categories
const categoryMap = new Map();
for (const product of products) {
  if (!categoryMap.has(product.category)) {
    const [existingCategory] = await db.select().from(schema.productCategories).where(eq(schema.productCategories.name, product.category)).limit(1);
    
    if (existingCategory) {
      categoryMap.set(product.category, existingCategory.id);
    } else {
      const [newCategory] = await db.insert(schema.productCategories).values({
        name: product.category,
        description: `${product.category} furniture products`,
      });
      categoryMap.set(product.category, newCategory.insertId);
    }
  }
}

// Insert products
for (const product of products) {
  const categoryId = categoryMap.get(product.category);
  
  await db.insert(schema.products).values({
    name: product.name,
    sku: product.sku,
    description: product.description,
    categoryId: categoryId,
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    remainingStock: 0, // B2B模式，默认无尾货库存
    unit: "pcs",
    imageUrl: product.imageUrl,
    status: "active",
    productionMode: product.productionMode,
  });
  
  console.log(`✓ Created: ${product.name} (${product.sku})`);
}

console.log("\n✅ Successfully created 30 furniture products!");

await connection.end();
