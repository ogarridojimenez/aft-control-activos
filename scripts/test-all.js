/**
 * AFT System - Comprehensive Test Script
 * Tests: Database, API endpoints, Pages, Full flow
 * Run: node scripts/test-all.js
 */

const { execSync } = require('child_process');
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const PGPASSWORD = 'root';
const PSQL = `"C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe"`;

let passed = 0;
let failed = 0;
let warnings = 0;

function log(section, msg, status) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`  ${icon} [${section}] ${msg}`);
  if (status === 'PASS') passed++;
  else if (status === 'FAIL') failed++;
  else warnings++;
}

function psql(query) {
  try {
    const result = execSync(
      `$env:PGPASSWORD="${PGPASSWORD}"; & ${PSQL} -U postgres -d aft -t -A -c "${query.replace(/"/g, '\\"')}"`,
      { shell: 'powershell', encoding: 'utf8', timeout: 10000 }
    );
    return result.trim();
  } catch (e) {
    return null;
  }
}

function httpGet(path) {
  return new Promise((resolve) => {
    http.get(`${BASE_URL}${path}`, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', () => resolve({ status: 0, headers: {}, body: '' }));
  });
}

function httpPost(path, body, contentType = 'application/json') {
  return new Promise((resolve) => {
    const url = new URL(`${BASE_URL}${path}`);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': contentType, 'Content-Length': Buffer.byteLength(body) },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', () => resolve({ status: 0, headers: {}, body: '' }));
    req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  AFT SYSTEM - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(60) + '\n');

  // ============================================
  // SECTION 1: DATABASE
  // ============================================
  console.log('📦 SECTION 1: DATABASE (PostgreSQL Local)');
  console.log('-'.repeat(50));

  // Test 1.1: Connection
  const connResult = psql('SELECT 1;');
  log('DB', 'PostgreSQL connection', connResult === '1' ? 'PASS' : 'FAIL');

  // Test 1.2: Tables exist
  const tables = psql("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;");
  const expectedTables = ['areas', 'assets', 'inventories', 'inventory_items', 'offline_sync', 'reconciliations', 'users'];
  const foundTables = tables ? tables.split('\n').map(t => t.trim()).filter(t => t) : [];
  const allTablesExist = expectedTables.every(t => foundTables.includes(t));
  log('DB', `All 7 tables exist (${foundTables.length} found)`, allTablesExist ? 'PASS' : 'FAIL');

  // Test 1.3: Areas data
  const areasCount = psql("SELECT COUNT(*) FROM areas;");
  log('DB', `Areas: ${areasCount} rows (expected 6)`, areasCount === '6' ? 'PASS' : 'FAIL');

  // Test 1.4: Assets data
  const assetsCount = psql("SELECT COUNT(*) FROM assets;");
  log('DB', `Assets: ${assetsCount} rows (expected 21)`, assetsCount === '21' ? 'PASS' : 'FAIL');

  // Test 1.5: Users data
  const usersCount = psql("SELECT COUNT(*) FROM users;");
  log('DB', `Users: ${usersCount} rows (expected 1)`, usersCount === '1' ? 'PASS' : 'FAIL');

  // Test 1.6: Test inventory exists
  const invCount = psql("SELECT COUNT(*) FROM inventories;");
  log('DB', `Inventories: ${invCount} rows (expected >= 1)`, parseInt(invCount) >= 1 ? 'PASS' : 'FAIL');

  // Test 1.7: Inventory items exist
  const itemsCount = psql("SELECT COUNT(*) FROM inventory_items;");
  log('DB', `Inventory items: ${itemsCount} rows (expected >= 5)`, parseInt(itemsCount) >= 5 ? 'PASS' : 'FAIL');

  // Test 1.8: Reconciliation exists
  const reconCount = psql("SELECT COUNT(*) FROM reconciliations;");
  log('DB', `Reconciliations: ${reconCount} rows (expected >= 1)`, parseInt(reconCount) >= 1 ? 'PASS' : 'FAIL');

  // Test 1.9: Foreign key integrity
  const fkCheck = psql("SELECT COUNT(*) FROM assets a LEFT JOIN areas ar ON a.area_id = ar.id WHERE ar.id IS NULL;");
  log('DB', 'Foreign key integrity (assets -> areas)', fkCheck === '0' ? 'PASS' : 'FAIL');

  // Test 1.10: Indexes exist
  const idxCount = psql("SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';");
  log('DB', `Indexes: ${idxCount} (expected >= 8)`, parseInt(idxCount) >= 8 ? 'PASS' : 'FAIL');

  console.log('');

  // ============================================
  // SECTION 2: API ENDPOINTS
  // ============================================
  console.log('🔌 SECTION 2: API ENDPOINTS');
  console.log('-'.repeat(50));

  // Test 2.1: Areas API (requires auth, expect 401)
  const areasApi = await httpGet('/api/areas');
  log('API', 'GET /api/areas returns 401 (auth required)', areasApi.status === 401 ? 'PASS' : 'FAIL');

  // Test 2.2: Inventories API (requires auth, expect 401)
  const invApi = await httpGet('/api/inventories');
  log('API', 'GET /api/inventories returns 401 (auth required)', invApi.status === 401 ? 'PASS' : 'FAIL');

  // Test 2.3: Upload API (requires auth, expect 401)
  const uploadApi = await httpPost('/api/upload', '');
  log('API', 'POST /api/upload returns 401 (auth required)', uploadApi.status === 401 ? 'PASS' : 'FAIL');

  // Test 2.4: Sync API (requires auth, expect 401)
  const syncApi = await httpPost('/api/sync/inventory', '{}');
  log('API', 'POST /api/sync/inventory returns 401 (auth required)', syncApi.status === 401 ? 'PASS' : 'FAIL');

  // Test 2.5: QR API (requires auth, expect 401)
  const qrApi = await httpPost('/api/qr', '{}');
  log('API', 'POST /api/qr returns 401 (auth required)', qrApi.status === 401 ? 'PASS' : 'FAIL');

  // Test 2.6: Report API (requires auth, expect 401)
  const invId = psql("SELECT id FROM inventories LIMIT 1;");
  if (invId) {
    const reportApi = await httpGet(`/api/inventories/${invId}/report?format=pdf`);
    log('API', 'GET /api/inventories/[id]/report returns 401 (auth required)', reportApi.status === 401 ? 'PASS' : 'FAIL');

    const reconApi = await httpGet(`/api/inventories/${invId}/reconciliation`);
    log('API', 'GET /api/inventories/[id]/reconciliation returns 401 (auth required)', reconApi.status === 401 ? 'PASS' : 'FAIL');
  } else {
    log('API', 'Report/Reconciliation endpoints', 'WARN');
    warnings += 2;
  }

  console.log('');

  // ============================================
  // SECTION 3: PAGES
  // ============================================
  console.log('📄 SECTION 3: PAGES (Server-side rendering)');
  console.log('-'.repeat(50));

  // Test 3.1: Home page redirects to login
  const homePage = await httpGet('/');
  const homeOk = homePage.status === 200 || homePage.status === 307 || homePage.status === 302;
  log('PAGE', 'Home page (/) loads or redirects to login', homeOk ? 'PASS' : 'FAIL');

  // Test 3.2: Login page
  const loginPage = await httpGet('/login');
  log('PAGE', 'Login page (/login) loads', loginPage.status === 200 ? 'PASS' : 'FAIL');

  // Test 3.3: Assets page (redirects to login)
  const assetsPage = await httpGet('/assets');
  const assetsOk = assetsPage.status === 200 || assetsPage.status === 307 || assetsPage.status === 302;
  log('PAGE', 'Assets page (/assets) loads or redirects', assetsOk ? 'PASS' : 'FAIL');

  // Test 3.4: Inventories page (redirects to login)
  const invPage = await httpGet('/inventories');
  const invOk = invPage.status === 200 || invPage.status === 307 || invPage.status === 302;
  log('PAGE', 'Inventories page (/inventories) loads or redirects', invOk ? 'PASS' : 'FAIL');

  // Test 3.5: Upload page (redirects to login)
  const uploadPage = await httpGet('/upload');
  const uploadOk = uploadPage.status === 200 || uploadPage.status === 307 || uploadPage.status === 302;
  log('PAGE', 'Upload page (/upload) loads or redirects', uploadOk ? 'PASS' : 'FAIL');

  // Test 3.6: QR page (redirects to login)
  const qrPage = await httpGet('/qr');
  const qrOk = qrPage.status === 200 || qrPage.status === 307 || qrPage.status === 302;
  log('PAGE', 'QR page (/qr) loads or redirects', qrOk ? 'PASS' : 'FAIL');

  // Test 3.7: Inventory detail page
  if (invId) {
    const detailPage = await httpGet(`/inventories/${invId}`);
    const detailOk = detailPage.status === 200 || detailPage.status === 307 || detailPage.status === 302;
    log('PAGE', `Inventory detail (/inventories/${invId.slice(0, 8)}...) loads or redirects`, detailOk ? 'PASS' : 'FAIL');
  }

  console.log('');

  // ============================================
  // SECTION 4: DATA INTEGRITY
  // ============================================
  console.log('🔍 SECTION 4: DATA INTEGRITY');
  console.log('-'.repeat(50));

  // Test 4.1: All assets have valid format
  const badAssets = psql("SELECT COUNT(*) FROM assets WHERE asset_id !~ '^MB[0-9]{5,}$';");
  log('DATA', 'All asset IDs match MB+5+digits format', badAssets === '0' ? 'PASS' : 'FAIL');

  // Test 4.2: All areas have unique codes
  const dupCodes = psql("SELECT COUNT(*) FROM (SELECT code FROM areas GROUP BY code HAVING COUNT(*) > 1) t;");
  log('DATA', 'All area codes are unique', dupCodes === '0' ? 'PASS' : 'FAIL');

  // Test 4.3: Admin user has correct role
  const adminRole = psql("SELECT role FROM users WHERE email = 'admin@ejemplo.com';");
  log('DATA', 'Admin user has role=admin', adminRole === 'admin' ? 'PASS' : 'FAIL');

  // Test 4.4: Test inventory has correct status
  const invStatus = psql("SELECT status FROM inventories WHERE id = 'e923a4ed-cd19-4c1b-ab2a-0f8ecd629553';");
  log('DATA', 'Test inventory status=completed', invStatus === 'completed' ? 'PASS' : 'FAIL');

  // Test 4.5: Inventory items match expected/found ratio
  const foundCount = psql("SELECT COUNT(*) FROM inventory_items WHERE inventory_id = 'e923a4ed-cd19-4c1b-ab2a-0f8ecd629553' AND quantity_found > 0;");
  const missingCount = psql("SELECT COUNT(*) FROM inventory_items WHERE inventory_id = 'e923a4ed-cd19-4c1b-ab2a-0f8ecd629553' AND quantity_found = 0;");
  log('DATA', `Test inventory: ${foundCount} found, ${missingCount} missing`, parseInt(foundCount) === 4 && parseInt(missingCount) === 1 ? 'PASS' : 'FAIL');

  // Test 4.6: Reconciliation summary matches
  const reconSummary = psql("SELECT summary->>'accuracy_percentage' FROM reconciliations WHERE inventory_id = 'e923a4ed-cd19-4c1b-ab2a-0f8ecd629553';");
  log('DATA', `Reconciliation accuracy: ${reconSummary}%`, reconSummary === '80' ? 'PASS' : 'FAIL');

  console.log('');

  // ============================================
  // SECTION 5: CONFIGURATION FILES
  // ============================================
  console.log('⚙️  SECTION 5: CONFIGURATION FILES');
  console.log('-'.repeat(50));

  const fs = require('fs');
  const path = require('path');

  // Test 5.1: Admin .env.local exists
  const adminEnv = path.join(__dirname, '..', 'apps', 'admin', '.env.local');
  const adminEnvExists = fs.existsSync(adminEnv);
  log('CONFIG', 'apps/admin/.env.local exists', adminEnvExists ? 'PASS' : 'FAIL');

  if (adminEnvExists) {
    const adminEnvContent = fs.readFileSync(adminEnv, 'utf8');
    log('CONFIG', 'NEXT_PUBLIC_SUPABASE_URL configured', adminEnvContent.includes('NEXT_PUBLIC_SUPABASE_URL') ? 'PASS' : 'FAIL');
    log('CONFIG', 'SUPABASE_SERVICE_ROLE_KEY configured', adminEnvContent.includes('SUPABASE_SERVICE_ROLE_KEY') ? 'PASS' : 'FAIL');
    // DATABASE_URL should NOT be present (using Supabase, not local Postgres)
    log('CONFIG', 'DATABASE_URL removed (using Supabase)', !adminEnvContent.includes('DATABASE_URL') ? 'PASS' : 'FAIL');
  }

  // Test 5.2: Mobile .env exists
  const mobileEnv = path.join(__dirname, '..', 'apps', 'mobile', '.env');
  const mobileEnvExists = fs.existsSync(mobileEnv);
  log('CONFIG', 'apps/mobile/.env exists', mobileEnvExists ? 'PASS' : 'FAIL');

  if (mobileEnvExists) {
    const mobileEnvContent = fs.readFileSync(mobileEnv, 'utf8');
    log('CONFIG', 'EXPO_PUBLIC_SUPABASE_URL configured', mobileEnvContent.includes('EXPO_PUBLIC_SUPABASE_URL') ? 'PASS' : 'FAIL');
    log('CONFIG', 'EXPO_PUBLIC_ADMIN_API_URL configured', mobileEnvContent.includes('EXPO_PUBLIC_ADMIN_API_URL') ? 'PASS' : 'FAIL');
  }

  // Test 5.3: Supabase admin client exists
  const supabaseAdmin = path.join(__dirname, '..', 'apps', 'admin', 'src', 'lib', 'supabase', 'admin.ts');
  log('CONFIG', 'Supabase admin client exists', fs.existsSync(supabaseAdmin) ? 'PASS' : 'FAIL');

  // Test 5.4: Drizzle removed (should NOT exist)
  const drizzleSchema = path.join(__dirname, '..', 'apps', 'admin', 'src', 'lib', 'db', 'schema', 'index.ts');
  log('CONFIG', 'Drizzle removed (using Supabase)', !fs.existsSync(drizzleSchema) ? 'PASS' : 'FAIL');

  console.log('');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('='.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`  ✅ Passed:   ${passed}`);
  console.log(`  ❌ Failed:   ${failed}`);
  console.log(`  ⚠️  Warnings: ${warnings}`);
  console.log(`  📊 Total:    ${passed + failed + warnings}`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n  🎉 ALL TESTS PASSED! System is ready for Android Studio testing.\n');
  } else {
    console.log(`\n  ⚠️  ${failed} test(s) failed. Review the issues above before proceeding.\n`);
  }
}

runTests().catch(e => {
  console.error('Test runner error:', e.message);
  process.exit(1);
});
