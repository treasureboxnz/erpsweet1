import mysql from 'mysql2/promise';
import https from 'https';

const key = process.env.APOLLO_API_KEY || '';

function apolloMatch(id) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ id });
    const req = https.request({
      hostname: 'api.apollo.io', path: '/api/v1/people/match', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': key }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, person: JSON.parse(body).person || null }); }
        catch(e) { resolve({ status: res.statusCode, person: null }); }
      });
    });
    req.on('error', () => resolve({ status: 0, person: null }));
    req.write(data); req.end();
  });
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute(
    'SELECT id, apolloPersonId, companyName FROM apollo_candidates WHERE apolloPersonId IS NOT NULL AND importStatus="pending" LIMIT 50'
  );
  await conn.end();
  
  console.log(`Testing ${rows.length} candidates from DB...`);
  
  let withEmail = 0, noEmail = 0, noMatch = 0, withPhone = 0;
  const emailSamples = [];
  const noEmailSamples = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const r = await apolloMatch(row.apolloPersonId);
    
    if (!r.person) {
      noMatch++;
    } else if (r.person.email) {
      withEmail++;
      if (emailSamples.length < 8) {
        emailSamples.push(`${r.person.name} | ${r.person.email} [${r.person.email_status}] @ ${row.companyName}`);
      }
    } else {
      noEmail++;
      if (noEmailSamples.length < 3) {
        noEmailSamples.push(`${r.person.name} | email_status=${r.person.email_status} @ ${row.companyName}`);
      }
    }
    
    if (r.person?.phone_numbers?.length > 0) withPhone++;
    
    if ((i + 1) % 10 === 0) {
      console.log(`Progress: ${i+1}/${rows.length} | email: ${withEmail} | no_email: ${noEmail} | no_match: ${noMatch}`);
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n=== FINAL RESULTS (50 candidates) ===');
  console.log(`With email:    ${withEmail} (${Math.round(withEmail/rows.length*100)}%)`);
  console.log(`No email:      ${noEmail} (${Math.round(noEmail/rows.length*100)}%)`);
  console.log(`No match:      ${noMatch}`);
  console.log(`With phone:    ${withPhone}`);
  
  console.log('\nEmail samples (up to 8):');
  emailSamples.forEach(s => console.log('  ✓', s));
  
  console.log('\nNo-email samples (up to 3):');
  noEmailSamples.forEach(s => console.log('  ✗', s));
}

main().catch(console.error);
