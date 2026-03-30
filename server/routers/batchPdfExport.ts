import { z } from "zod";
import { getDb } from "../db";
import { quotations, quotationItems, quotationBatches, companies } from "../../drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import archiver from "archiver";
import { Readable } from "stream";

/**
 * Generate PDF content for a single quotation
 * This is a simplified version - you can enhance with proper PDF library like pdfkit or puppeteer
 */
async function generateQuotationPDF(quotation: any, items: any[], customer: any): Promise<Buffer> {
  // For now, we'll create a simple HTML-based PDF representation
  // In production, you'd use a proper PDF library like pdfkit or puppeteer
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .info { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>报价单</h1>
    <p>Quotation</p>
  </div>
  
  <div class="info">
    <p><strong>报价单号:</strong> ${quotation.quotationNumber}</p>
    <p><strong>客户:</strong> ${customer?.companyName || 'N/A'}</p>
    <p><strong>报价日期:</strong> ${new Date(quotation.createdAt).toLocaleDateString('zh-CN')}</p>
    <p><strong>有效期:</strong> ${new Date(quotation.validUntil).toLocaleDateString('zh-CN')}</p>
    <p><strong>报价模式:</strong> ${quotation.quotationMode === 'fob' ? 'FOB模式' : '批次模式'}</p>
    <p><strong>货币:</strong> ${quotation.currency}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>产品名称</th>
        <th>SKU</th>
        <th>数量</th>
        <th>单价</th>
        <th>小计</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${item.productName}</td>
          <td>${item.productSku}</td>
          <td>${item.fobQuantity || '-'}</td>
          <td>${item.fobUnitPrice || '-'}</td>
          <td>${item.fobSubtotal || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="total">
    总金额: ${quotation.currency} ${quotation.totalAmount}
  </div>
  
  ${quotation.notes ? `<div style="margin-top: 30px;"><strong>备注:</strong><br/>${quotation.notes}</div>` : ''}
</body>
</html>
  `;
  
  // Convert HTML to Buffer (simplified - in production use proper PDF generation)
  return Buffer.from(html, 'utf-8');
}

export const batchPdfExportRouter = router({
  /**
   * Export multiple quotations as a ZIP file
   */
  exportBatch: protectedProcedure
    .input(z.object({
      quotationIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      if (input.quotationIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No quotations selected" });
      }
      
      // Get all quotations
      const conditions = [inArray(quotations.id, input.quotationIds)];
      if (ctx.user.erpCompanyId) conditions.push(eq(quotations.erpCompanyId, ctx.user.erpCompanyId));
      const quotationsList = await db
        .select()
        .from(quotations)
        .where(and(...conditions));
      
      if (quotationsList.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No quotations found" });
      }
      
      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });
      
      const chunks: Buffer[] = [];
      
      // Collect archive data
      archive.on('data', (chunk) => chunks.push(chunk));
      
      // Generate PDFs for each quotation and add to archive
      for (const quotation of quotationsList) {
        // Get items
        const items = await db
          .select()
          .from(quotationItems)
          .where(eq(quotationItems.quotationId, quotation.id));
        
        // Get customer info
        const [customer] = await db
          .select()
          .from(companies)
          .where(eq(companies.id, quotation.customerId))
          .limit(1);
        
        // Generate PDF
        const pdfBuffer = await generateQuotationPDF(quotation, items, customer);
        
        // Add to archive
        const filename = `${quotation.quotationNumber}.html`; // Using .html for now, change to .pdf when using proper PDF library
        archive.append(pdfBuffer, { name: filename });
      }
      
      // Finalize archive
      await archive.finalize();
      
      // Wait for all chunks to be collected
      await new Promise((resolve) => {
        archive.on('end', resolve);
      });
      
      // Combine chunks into single buffer
      const zipBuffer = Buffer.concat(chunks);
      
      // Convert to base64 for transmission
      const base64Zip = zipBuffer.toString('base64');
      
      return {
        success: true,
        filename: `quotations_${Date.now()}.zip`,
        data: base64Zip,
        count: quotationsList.length,
      };
    }),
});
