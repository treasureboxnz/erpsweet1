/**
 * 批量富化 companies 表中从 Apollo 导入的公司信息
 * 通过 /organizations/search 查找公司 domain，再调用 /organizations/enrich 补全全部字段
 */
import mysql from 'mysql2/promise';
import https from 'https';

const APOLLO_API_KEY = process.env.APOLLO_API_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL || '';

function apolloPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.apollo.io',
      path: `/api/v1${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': APOLLO_API_KEY,
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function apolloGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.apollo.io',
      path: `/api/v1${path}`,
      method: 'GET',
      headers: { 'X-Api-Key': APOLLO_API_KEY },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// 通过公司名搜索获取 domain 和 logo
async function findCompanyInfo(companyName) {
  try {
    const { status, data } = await apolloPost('/organizations/search', {
      q_organization_name: companyName,
      page: 1,
      per_page: 1,
    });
    if (status === 429) { await delay(5000); return null; }
    const orgs = data.organizations || [];
    if (orgs.length > 0) {
      const org = orgs[0];
      return {
        domain: org.website_url || org.primary_domain || null,
        logoUrl: org.logo_url || null,
        linkedinUrl: org.linkedin_url || null,
        phone: org.primary_phone?.sanitized_number || null,
        description: org.short_description || null,
        foundedYear: org.founded_year || null,
        industry: org.industry || null,
        employeeCount: org.estimated_num_employees || null,
        annualRevenue: org.annual_revenue_printed || null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// 通过 domain 富化公司信息
async function enrichOrgByDomain(domain) {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    if (!cleanDomain) return null;
    const { status, data } = await apolloGet(`/organizations/enrich?domain=${encodeURIComponent(cleanDomain)}`);
    if (status === 429) { await delay(5000); return null; }
    return data.organization || null;
  } catch {
    return null;
  }
}

// 将员工数转换为公司规模枚举 (small|medium|large|enterprise)
function employeeCountToScale(count) {
  if (!count) return null;
  if (count < 50) return 'small';
  if (count < 200) return 'medium';
  if (count < 1000) return 'large';
  return 'enterprise';
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // 获取所有信息不完整的 Apollo 公司
  const [companies] = await conn.execute(`
    SELECT id, companyName, website, linkedinUrl, phone, description, foundedYear, 
           industryType, companyScale, logoUrl, annualRevenue
    FROM companies 
    WHERE source = 'Apollo'
    ORDER BY id ASC
  `);
  
  console.log(`共找到 ${companies.length} 家 Apollo 公司需要富化`);
  
  let enriched = 0, failed = 0;
  
  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    const needEnrich = !c.website || !c.description || !c.logoUrl;
    
    if (!needEnrich) {
      console.log(`[${i+1}/${companies.length}] ${c.companyName} - 已完整，跳过`);
      continue;
    }
    
    console.log(`[${i+1}/${companies.length}] 处理: ${c.companyName}`);
    
    let domain = c.website ? c.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null;
    
    // 如果没有 domain，通过公司名搜索并直接获取全部信息
    let orgInfo = null;
    if (!domain) {
      orgInfo = await findCompanyInfo(c.companyName);
      if (orgInfo?.domain) {
        domain = orgInfo.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        console.log(`  → 找到 domain: ${domain}, Logo: ${orgInfo.logoUrl ? '✓' : '✗'}`);
      }
      await delay(400);
    }
    
    if (!domain && !orgInfo) {
      console.log(`  → 无法找到 domain，跳过`);
      failed++;
      continue;
    }
    
    // 如果通过搜索没有得到完整信息，再通过 domain 富化
    if (!orgInfo && domain) {
      const orgData = await enrichOrgByDomain(domain);
      await delay(400);
      if (orgData) {
        orgInfo = {
          domain: orgData.website_url || domain,
          logoUrl: orgData.logo_url || null,
          linkedinUrl: orgData.linkedin_url || null,
          phone: orgData.primary_phone?.sanitized_number || null,
          description: orgData.short_description || null,
          foundedYear: orgData.founded_year || null,
          industry: orgData.industry || null,
          employeeCount: orgData.estimated_num_employees || null,
          annualRevenue: orgData.annual_revenue_printed || null,
        };
      }
    }
    
    if (!orgInfo) {
      console.log(`  → organizations/enrich 无结果`);
      failed++;
      continue;
    }
    
    const updates = {};
    if (!c.website && orgInfo.domain) updates.website = orgInfo.domain;
    if (!c.linkedinUrl && orgInfo.linkedinUrl) updates.linkedinUrl = orgInfo.linkedinUrl;
    if (!c.phone && orgInfo.phone) updates.phone = orgInfo.phone;
    if (!c.description && orgInfo.description) updates.description = orgInfo.description;
    if (!c.foundedYear && orgInfo.foundedYear) updates.foundedYear = orgInfo.foundedYear;
    if (!c.industryType && orgInfo.industry) updates.industryType = orgInfo.industry;
    if (!c.logoUrl && orgInfo.logoUrl) updates.logoUrl = orgInfo.logoUrl;
    if (!c.annualRevenue && orgInfo.annualRevenue) updates.annualRevenue = orgInfo.annualRevenue;
    if (!c.companyScale && orgInfo.employeeCount) {
      updates.companyScale = employeeCountToScale(orgInfo.employeeCount);
    }
    
    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
      const values = Object.values(updates);
      await conn.execute(`UPDATE companies SET ${setClauses} WHERE id = ?`, [...values, c.id]);
      enriched++;
      console.log(`  ✓ 更新: ${Object.keys(updates).join(', ')}`);
    } else {
      console.log(`  → 无新信息可更新`);
    }
  }
  
  console.log(`\n=== 公司富化完成 ===`);
  console.log(`成功: ${enriched}, 失败/跳过: ${failed}`);
  
  await conn.end();
}

main().catch(console.error);
