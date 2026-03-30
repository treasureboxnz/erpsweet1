/**
 * 批量富化Apollo候选人数据
 * - 人员信息：通过 /people/match 获取完整姓名、邮箱、LinkedIn
 * - 公司信息：通过 /organizations/enrich 获取 Logo、domain、行业、员工数、年收入、地址、描述、成立年份
 */
import mysql from 'mysql2/promise';
import https from 'https';

const APOLLO_API_KEY = process.env.APOLLO_API_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL || '';

// Apollo API POST请求
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

// Apollo API GET请求（organizations/enrich）
function apolloGet(endpoint) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.apollo.io',
      path: `/api/v1${endpoint}`,
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

async function enrichPerson(apolloPersonId) {
  try {
    const { status, data } = await apolloPost('/people/match', { id: apolloPersonId });
    if (status === 429) { await delay(5000); return null; }
    const person = data.person;
    if (!person) return null;
    const phones = person.phone_numbers || [];
    const org = person.organization || {};
    return {
      firstName: person.first_name || null,
      lastName: person.last_name || null,
      fullName: person.name || null,
      email: person.email || null,
      linkedinUrl: person.linkedin_url || null,
      phone: phones[0]?.sanitized_number || null,
      // Company info from match response
      companyDomain: org.website_url || org.primary_domain || null,
      companyLogoUrl: org.logo_url || null,
      companyLinkedinUrl: org.linkedin_url || null,
      companyPhone: org.primary_phone?.sanitized_number || null,
      companyDescription: org.short_description || null,
      companyFoundedYear: org.founded_year || null,
      employeeCount: org.estimated_num_employees || null,
      annualRevenue: org.annual_revenue_printed || null,
      industry: org.industry || null,
      companyAddress: org.raw_address || null,
    };
  } catch {
    return null;
  }
}

async function enrichOrg(domain) {
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

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // 获取所有未富化或信息不完整的候选人
  const [candidates] = await conn.execute(`
    SELECT id, apolloPersonId, companyName, companyDomain, companyLogoUrl, 
           fullName, email, enrichedAt
    FROM apollo_candidates 
    WHERE apolloPersonId IS NOT NULL
    ORDER BY id ASC
  `);
  
  console.log(`共找到 ${candidates.length} 个候选人需要处理`);
  
  let personEnriched = 0, personFailed = 0, orgEnriched = 0;
  const orgLogoCache = {}; // domain -> logoUrl cache
  
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const needPersonEnrich = !c.enrichedAt || !c.email;
    const needOrgEnrich = !c.companyLogoUrl;
    
    if (!needPersonEnrich && !needOrgEnrich) {
      console.log(`[${i+1}/${candidates.length}] ID=${c.id} ${c.fullName} - 已完整，跳过`);
      continue;
    }
    
    const updates = {};
    
    // 富化人员信息
    if (needPersonEnrich && c.apolloPersonId) {
      const enriched = await enrichPerson(c.apolloPersonId);
      if (enriched) {
        if (enriched.fullName) updates.fullName = enriched.fullName;
        if (enriched.firstName) updates.firstName = enriched.firstName;
        if (enriched.lastName) updates.lastName = enriched.lastName;
        if (enriched.email) updates.email = enriched.email;
        if (enriched.linkedinUrl) updates.linkedinUrl = enriched.linkedinUrl;
        if (enriched.phone) updates.phone = enriched.phone;
        if (enriched.companyDomain && !c.companyDomain) updates.companyDomain = enriched.companyDomain;
        if (enriched.companyLogoUrl && !c.companyLogoUrl) updates.companyLogoUrl = enriched.companyLogoUrl;
        if (enriched.companyLinkedinUrl) updates.companyLinkedinUrl = enriched.companyLinkedinUrl;
        if (enriched.companyPhone) updates.companyPhone = enriched.companyPhone;
        if (enriched.companyDescription) updates.companyDescription = enriched.companyDescription;
        if (enriched.companyFoundedYear) updates.companyFoundedYear = enriched.companyFoundedYear;
        if (enriched.employeeCount) updates.employeeCount = enriched.employeeCount;
        if (enriched.annualRevenue) updates.annualRevenue = enriched.annualRevenue;
        if (enriched.industry) updates.industry = enriched.industry;
        if (enriched.companyAddress) updates.companyAddress = enriched.companyAddress;
        updates.enrichedAt = new Date();
        personEnriched++;
        console.log(`[${i+1}/${candidates.length}] ✓ ${enriched.fullName || c.fullName} | ${enriched.email || '无邮箱'} | Logo: ${enriched.companyLogoUrl ? '✓' : '✗'}`);
      } else {
        personFailed++;
        console.log(`[${i+1}/${candidates.length}] ✗ ID=${c.id} 富化失败`);
      }
    }
    
    // 如果还没有Logo，尝试通过domain获取
    const domainToUse = updates.companyDomain || c.companyDomain;
    if (!updates.companyLogoUrl && !c.companyLogoUrl && domainToUse) {
      const cleanDomain = domainToUse.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
      if (orgLogoCache[cleanDomain]) {
        updates.companyLogoUrl = orgLogoCache[cleanDomain];
        orgEnriched++;
      } else {
        const orgData = await enrichOrg(cleanDomain);
        if (orgData?.logo_url) {
          updates.companyLogoUrl = orgData.logo_url;
          orgLogoCache[cleanDomain] = orgData.logo_url;
          // Also update other org fields if missing
          if (!updates.companyDescription && orgData.short_description) updates.companyDescription = orgData.short_description;
          if (!updates.companyFoundedYear && orgData.founded_year) updates.companyFoundedYear = orgData.founded_year;
          if (!updates.employeeCount && orgData.estimated_num_employees) updates.employeeCount = orgData.estimated_num_employees;
          if (!updates.annualRevenue && orgData.annual_revenue_printed) updates.annualRevenue = orgData.annual_revenue_printed;
          orgEnriched++;
          console.log(`  → 公司Logo获取成功: ${orgData.logo_url.substring(0, 60)}...`);
        }
        await delay(200); // org enrich rate limit
      }
    }
    
    // 执行更新
    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
      const values = Object.values(updates).map(v => v instanceof Date ? v.toISOString().slice(0, 19).replace('T', ' ') : v);
      await conn.execute(`UPDATE apollo_candidates SET ${setClauses} WHERE id = ?`, [...values, c.id]);
    }
    
    // Rate limit: ~2 req/sec for people/match
    await delay(400);
    
    // Progress report every 50
    if ((i + 1) % 50 === 0) {
      console.log(`\n--- 进度: ${i+1}/${candidates.length} | 人员富化: ${personEnriched} | 失败: ${personFailed} | 公司Logo: ${orgEnriched} ---\n`);
    }
  }
  
  console.log(`\n=== 批量富化完成 ===`);
  console.log(`人员富化成功: ${personEnriched}`);
  console.log(`人员富化失败: ${personFailed}`);
  console.log(`公司Logo获取: ${orgEnriched}`);
  
  await conn.end();
}

main().catch(console.error);
