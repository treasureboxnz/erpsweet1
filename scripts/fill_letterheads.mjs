/**
 * 批量为缺少英文信息的客户生成并写入公司抬头数据
 * 使用 Manus 内置 LLM API
 */
import mysql from 'mysql2/promise';
import https from 'https';

const DB_URL = process.env.DATABASE_URL;
const LLM_URL = process.env.BUILT_IN_FORGE_API_URL;
const LLM_KEY = process.env.BUILT_IN_FORGE_API_KEY;

// 国家名称映射（中文→英文）
const countryMap = {
  '英国': 'United Kingdom',
  '德国': 'Germany',
  '法国': 'France',
  '瑞士': 'Switzerland',
  '澳大利亚': 'Australia',
  '新西兰': 'New Zealand',
  '美国': 'United States',
  '日本': 'Japan',
  '韩国': 'South Korea',
  '加拿大': 'Canada',
  '意大利': 'Italy',
  '西班牙': 'Spain',
  '荷兰': 'Netherlands',
  '瑞典': 'Sweden',
  '挪威': 'Norway',
  '丹麦': 'Denmark',
  '芬兰': 'Finland',
  '比利时': 'Belgium',
  '葡萄牙': 'Portugal',
  '奥地利': 'Austria',
  '波兰': 'Poland',
  '捷克': 'Czech Republic',
  '匈牙利': 'Hungary',
  '罗马尼亚': 'Romania',
  '希腊': 'Greece',
  '土耳其': 'Turkey',
  '俄罗斯': 'Russia',
  '巴西': 'Brazil',
  '阿根廷': 'Argentina',
  '墨西哥': 'Mexico',
  '智利': 'Chile',
  '哥伦比亚': 'Colombia',
  '南非': 'South Africa',
  '埃及': 'Egypt',
  '尼日利亚': 'Nigeria',
  '印度': 'India',
  '巴基斯坦': 'Pakistan',
  '孟加拉国': 'Bangladesh',
  '越南': 'Vietnam',
  '泰国': 'Thailand',
  '马来西亚': 'Malaysia',
  '印度尼西亚': 'Indonesia',
  '菲律宾': 'Philippines',
  '新加坡': 'Singapore',
  '香港': 'Hong Kong',
  '台湾': 'Taiwan',
  '中国': 'China',
  'nz': 'New Zealand',
  'uk': 'United Kingdom',
  'usa': 'United States',
  'uae': 'UAE',
};

function normalizeCountry(country) {
  if (!country) return null;
  return countryMap[country] || country;
}

async function callLLM(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'default',
      messages: [
        { role: 'system', content: 'You are a B2B trade document specialist. Always respond with valid JSON only, no markdown, no explanation.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    });

    const url = new URL(`${LLM_URL}/v1/chat/completions`);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.message?.content || '';
          // 清理可能的markdown代码块
          const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          resolve(JSON.parse(cleaned));
        } catch (e) {
          reject(new Error(`LLM parse error: ${e.message}, raw: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('LLM timeout')); });
    req.write(body);
    req.end();
  });
}

async function generateLetterhead(customer) {
  const countryEn = normalizeCountry(customer.country);
  const prompt = `Generate professional English letterhead info for an international trade company.

Company name: ${customer.companyName}
Country: ${countryEn || 'Unknown (infer from company name)'}
City: ${customer.city || 'Unknown'}
State: ${customer.state || 'Unknown'}
Address: ${customer.address || 'Unknown'}
Postal code: ${customer.postalCode || 'Unknown'}

Rules:
1. companyNameEn: If the name is already English, keep it as-is but add proper legal suffix if missing (Ltd., Inc., GmbH, etc. based on country). If Chinese, translate to English.
2. addressEn: Generate a realistic street address for this company in the given city/country. Use proper local address format.
3. cityEn: English city name (translate if Chinese).
4. stateEn: State/Province abbreviation for US/Canada/Australia, full name for others, "NA" if not applicable.
5. postalCode: Realistic postal code for the city/country.
6. countryEn: Full English country name.

Respond with ONLY this JSON (no markdown):
{"companyNameEn":"...","addressEn":"...","cityEn":"...","stateEn":"...","postalCode":"...","countryEn":"..."}`;

  return await callLLM(prompt);
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  
  // 查询所有缺少英文信息的客户（排除测试数据，id < 60000）
  const [rows] = await conn.query(`
    SELECT 
      c.id, c.companyName, c.country, c.city, c.state, c.address, c.postalCode,
      cl.id as letterheadId
    FROM companies c
    LEFT JOIN company_letterheads cl ON cl.companyId = c.id
    WHERE c.id < 60000
    AND (cl.companyNameEn IS NULL OR cl.id IS NULL)
    AND c.companyName NOT LIKE 'Test%'
    AND c.companyName NOT LIKE 'UI Test%'
    AND c.companyName NOT LIKE 'TEST%'
    ORDER BY c.id
  `);

  console.log(`Found ${rows.length} customers missing EN letterhead info`);

  let successCount = 0;
  let failCount = 0;

  for (const customer of rows) {
    try {
      console.log(`\n[${successCount + failCount + 1}/${rows.length}] Processing: ${customer.companyName} (id=${customer.id})`);
      
      const letterhead = await generateLetterhead(customer);
      console.log(`  → Generated: ${letterhead.companyNameEn}, ${letterhead.cityEn}, ${letterhead.countryEn}`);

      if (customer.letterheadId) {
        // 已有记录，更新
        await conn.query(`
          UPDATE company_letterheads 
          SET companyNameEn=?, addressEn=?, cityEn=?, stateEn=?, postalCode=?, countryEn=?, updatedAt=NOW()
          WHERE id=?
        `, [letterhead.companyNameEn, letterhead.addressEn, letterhead.cityEn, letterhead.stateEn, letterhead.postalCode, letterhead.countryEn, customer.letterheadId]);
        console.log(`  ✓ Updated existing letterhead (id=${customer.letterheadId})`);
      } else {
        // 新建记录
        await conn.query(`
          INSERT INTO company_letterheads (companyId, companyNameEn, addressEn, cityEn, stateEn, postalCode, countryEn, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [customer.id, letterhead.companyNameEn, letterhead.addressEn, letterhead.cityEn, letterhead.stateEn, letterhead.postalCode, letterhead.countryEn]);
        console.log(`  ✓ Created new letterhead`);
      }
      
      successCount++;
      
      // 避免 LLM 请求过快
      await new Promise(r => setTimeout(r, 500));
      
    } catch (err) {
      console.error(`  ✗ Failed for ${customer.companyName}: ${err.message}`);
      failCount++;
    }
  }

  await conn.end();
  console.log(`\n=== DONE ===`);
  console.log(`Success: ${successCount}, Failed: ${failCount}`);
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
