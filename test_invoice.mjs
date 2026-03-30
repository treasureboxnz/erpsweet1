import { generateCustomerInvoice } from './server/invoiceGenerator.ts';
import fs from 'fs';

try {
  console.log('Generating customer invoice for order 540002...');
  const buf = await generateCustomerInvoice(540002, 1);
  console.log('Success! Buffer size:', buf.length);
  fs.writeFileSync('/tmp/test_invoice_540002.xlsx', buf);
  console.log('Saved to /tmp/test_invoice_540002.xlsx');
} catch(err) {
  console.error('Error:', err.message);
  console.error(err.stack);
}
