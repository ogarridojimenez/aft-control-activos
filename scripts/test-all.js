/**
 * AFT System - Configuration & Structure Test Script
 * Tests: Supabase connection, File structure, Config
 * Run: node scripts/test-all.js
 */

const fs = require('fs');
const path = require('path');

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

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  AFT SYSTEM - CONFIG TEST');
  console.log('='.repeat(60) + '\n');

  // ============================================
  // SECTION 1: CONFIG FILES
  // ============================================
  console.log('📦 SECTION 1: CONFIGURATION FILES');
  console.log('-'.repeat(50));

  // Test 1.1: Admin .env.local exists
  const adminEnv = path.join(__dirname, '..', 'apps', 'admin', '.env.local');
  const adminEnvExists = fs.existsSync(adminEnv);
  log('CONFIG', 'apps/admin/.env.local exists', adminEnvExists ? 'PASS' : 'FAIL');

  if (adminEnvExists) {
    const adminEnvContent = fs.readFileSync(adminEnv, 'utf8');
    const hasSupabaseUrl = adminEnvContent.includes('NEXT_PUBLIC_SUPABASE_URL');
    const hasAnonKey = adminEnvContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    const hasServiceKey = adminEnvContent.includes('SUPABASE_SERVICE_ROLE_KEY');
    log('CONFIG', 'NEXT_PUBLIC_SUPABASE_URL', hasSupabaseUrl ? 'PASS' : 'FAIL');
    log('CONFIG', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', hasAnonKey ? 'PASS' : 'FAIL');
    log('CONFIG', 'SUPABASE_SERVICE_ROLE_KEY', hasServiceKey ? 'PASS' : 'FAIL');
  }

  // Test 1.2: Mobile .env
  const mobileEnv = path.join(__dirname, '..', 'apps', 'mobile', '.env');
  const mobileEnvExists = fs.existsSync(mobileEnv);
  log('CONFIG', 'apps/mobile/.env exists', mobileEnvExists ? 'PASS' : 'FAIL');

  if (mobileEnvExists) {
    const mobileEnvContent = fs.readFileSync(mobileEnv, 'utf8');
    const hasSupabaseUrl = mobileEnvContent.includes('EXPO_PUBLIC_SUPABASE_URL');
    const hasAnonKey = mobileEnvContent.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    const hasAdminUrl = mobileEnvContent.includes('EXPO_PUBLIC_ADMIN_API_URL');
    log('CONFIG', 'EXPO_PUBLIC_SUPABASE_URL', hasSupabaseUrl ? 'PASS' : 'FAIL');
    log('CONFIG', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', hasAnonKey ? 'PASS' : 'FAIL');
    log('CONFIG', 'EXPO_PUBLIC_ADMIN_API_URL', hasAdminUrl ? 'PASS' : 'FAIL');
  }

  console.log('');

  // ============================================
  // SECTION 2: PROJECT STRUCTURE
  // ============================================
  console.log('📁 SECTION 2: PROJECT STRUCTURE');
  console.log('-'.repeat(50));

  // Root files - check workspace configs instead
  const rootConfigs = ['package.json', 'package-lock.json', 'turbo.json'];
  for (const file of rootConfigs) {
    const exists = fs.existsSync(path.join(__dirname, '..', file));
    log('STRUCT', `Root: ${file}`, exists ? 'PASS' : 'FAIL');
  }

  // Check workspace tsconfig exists (mobile)
  const mobileTsconfig = fs.existsSync(path.join(__dirname, '..', 'apps/mobile/tsconfig.json'));
  log('STRUCT', 'Workspace: tsconfig.json (mobile)', mobileTsconfig ? 'PASS' : 'FAIL');

  // Admin app
  const adminDirs = ['apps/admin/src/lib', 'apps/admin/src/app'];
  for (const dir of adminDirs) {
    const exists = fs.existsSync(path.join(__dirname, '..', dir));
    log('STRUCT', `Admin: ${dir}`, exists ? 'PASS' : 'FAIL');
  }

  // Mobile app
  const mobileDirs = ['apps/mobile/src/screens', 'apps/mobile/src/services', 'apps/mobile/src/hooks'];
  for (const dir of mobileDirs) {
    const exists = fs.existsSync(path.join(__dirname, '..', dir));
    log('STRUCT', `Mobile: ${dir}`, exists ? 'PASS' : 'FAIL');
  }

  // Packages
  const packages = ['packages/shared', 'packages/supabase'];
  for (const pkg of packages) {
    const exists = fs.existsSync(path.join(__dirname, '..', pkg));
    log('STRUCT', `Package: ${pkg}`, exists ? 'PASS' : 'FAIL');
  }

  console.log('');

  // ============================================
  // SECTION 3: MOBILE COMPONENTS
  // ============================================
  console.log('📱 SECTION 3: MOBILE COMPONENTS');
  console.log('-'.repeat(50));

  const mobileFiles = [
    'apps/mobile/App.tsx',
    'apps/mobile/src/screens/HomeScreen.tsx',
    'apps/mobile/src/screens/ScanScreen.tsx',
    'apps/mobile/src/screens/QrScannerScreen.tsx',
    'apps/mobile/src/screens/LocalAssetsScreen.tsx',
    'apps/mobile/src/services/sqliteService.ts',
    'apps/mobile/src/services/supabaseService.ts',
    'apps/mobile/src/services/syncService.ts',
    'apps/mobile/src/components/ErrorBoundary.tsx',
    'apps/mobile/src/utils/retry.ts',
    'apps/mobile/src/hooks/useNetworkStatus.ts',
  ];

  for (const file of mobileFiles) {
    const exists = fs.existsSync(path.join(__dirname, '..', file));
    log('MOBILE', file.split('/').pop(), exists ? 'PASS' : 'FAIL');
  }

  console.log('');

  // ============================================
  // SECTION 4: ADMIN COMPONENTS
  // ============================================
  console.log('🖥️  SECTION 4: ADMIN COMPONENTS');
  console.log('-'.repeat(50));

  const adminFiles = [
    'apps/admin/src/lib/supabase/admin.ts',
    'apps/admin/src/lib/auth/guard.ts',
    'apps/admin/src/app/api/upload/route.ts',
    'apps/admin/src/app/api/sync/inventory/route.ts',
  ];

  for (const file of adminFiles) {
    const exists = fs.existsSync(path.join(__dirname, '..', file));
    log('ADMIN', file.split('/').pop(), exists ? 'PASS' : 'FAIL');
  }

  // Pages (App Router)
  const adminPages = [
    'apps/admin/src/app/(app)/page.tsx',
    'apps/admin/src/app/login/page.tsx',
    'apps/admin/src/app/(app)/assets/page.tsx',
    'apps/admin/src/app/(app)/inventories/page.tsx',
  ];

  for (const page of adminPages) {
    const exists = fs.existsSync(path.join(__dirname, '..', page));
    log('ADMIN', page.split('/').slice(-2).join('/'), exists ? 'PASS' : 'FAIL');
  }

  console.log('');

  // ============================================
  // SECTION 5: DATABASE FILES
  // ============================================
  console.log('🗄️  SECTION 5: DATABASE FILES');
  console.log('-'.repeat(50));

  const dbFiles = [
    'packages/supabase/migrations/001_init.sql',
    'packages/supabase/migrations/002_rls_policies.sql',
    'packages/supabase/seed/001_seed_data.sql',
  ];

  for (const file of dbFiles) {
    const exists = fs.existsSync(path.join(__dirname, '..', file));
    log('DB', file.split('/').pop(), exists ? 'PASS' : 'FAIL');
  }

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
    console.log('\n  🎉 ALL TESTS PASSED!\n');
  } else {
    console.log(`\n  ⚠️  ${failed} test(s) failed. Review the issues above.\n`);
  }
}

runTests().catch(e => {
  console.error('Test runner error:', e.message);
  process.exit(1);
});
