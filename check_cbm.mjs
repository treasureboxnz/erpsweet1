import { getDb } from './server/db.ts';
import { products, orderItems, productVariants, packageBoxes } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const db = await getDb();

// Check product 300003
const [product] = await db.select().from(products).where(eq(products.id, 300003)).limit(1);
console.log('Product 300003:', {
  id: product?.id,
  name: product?.name,
  packageCbm: product?.packageCbm,
  packageLength: product?.packageLength,
  packageWidth: product?.packageWidth,
  packageHeight: product?.packageHeight,
});

// Check order items for order 540002
const items = await db.select().from(orderItems).where(eq(orderItems.orderId, 540002));
console.log('Order items for 540002:', items.map(i => ({
  id: i.id,
  productId: i.productId,
  variantId: i.variantId,
  quantity: i.quantity,
  cbm: i.cbm,
  grossWeight: i.grossWeight,
  netWeight: i.netWeight,
})));

// Check variant 870022
const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, 870022)).limit(1);
console.log('Variant 870022:', {
  id: variant?.id,
  code: variant?.code,
  totalCBM: variant?.totalCBM,
  totalGrossWeight: variant?.totalGrossWeight,
});

// Check package boxes for variant 870022
const boxes = await db.select().from(packageBoxes).where(eq(packageBoxes.variantId, 870022));
console.log('Package boxes for variant 870022:', boxes);

process.exit(0);
