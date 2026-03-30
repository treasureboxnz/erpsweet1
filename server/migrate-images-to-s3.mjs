/**
 * Migrate product images from Manus CDN to S3
 * This script downloads all product images from files.manuscdn.com and uploads them to S3
 */

import { getDb } from "./db.js";
import { products, productImages } from "../drizzle/schema.js";
import { storagePut } from "./storage.js";
import { eq } from "drizzle-orm";

async function migrateImagesToS3() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  console.log("Starting image migration to S3...\n");

  // Get all products with imageUrl
  const allProducts = await db
    .select()
    .from(products)
    .where(eq(products.imageUrl, products.imageUrl)); // Get all products

  console.log(`Found ${allProducts.length} products to check\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const product of allProducts) {
    if (!product.imageUrl) {
      skippedCount++;
      continue;
    }

    // Check if URL is from Manus CDN
    if (!product.imageUrl.includes("files.manuscdn.com")) {
      console.log(`[SKIP] Product ${product.id} (${product.sku}): Already using S3 or external URL`);
      skippedCount++;
      continue;
    }

    try {
      console.log(`[PROCESSING] Product ${product.id} (${product.sku}): ${product.name}`);
      console.log(`  Current URL: ${product.imageUrl}`);

      // Download image from Manus CDN
      const response = await fetch(product.imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "image/png";

      // Generate S3 key
      const fileExtension = contentType.split("/")[1] || "png";
      const s3Key = `product-media/${product.sku}/primary.${fileExtension}`;

      // Upload to S3
      const { url: s3Url } = await storagePut(s3Key, imageBuffer, contentType);

      console.log(`  New S3 URL: ${s3Url}`);

      // Update products table
      await db
        .update(products)
        .set({ imageUrl: s3Url })
        .where(eq(products.id, product.id));

      // Update product_images table (if exists)
      const productImageRecords = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id));

      for (const imageRecord of productImageRecords) {
        if (imageRecord.imageUrl && imageRecord.imageUrl.includes("files.manuscdn.com")) {
          await db
            .update(productImages)
            .set({ imageUrl: s3Url })
            .where(eq(productImages.id, imageRecord.id));
        }
      }

      migratedCount++;
      console.log(`  ✅ Migrated successfully\n`);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Error migrating product ${product.id}:`, error.message);
      console.error(`     ${error.stack}\n`);
    }
  }

  console.log("\n=== Migration Summary ===");
  console.log(`Total products checked: ${allProducts.length}`);
  console.log(`Successfully migrated: ${migratedCount}`);
  console.log(`Skipped (already migrated or no image): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);

  process.exit(0);
}

migrateImagesToS3().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
