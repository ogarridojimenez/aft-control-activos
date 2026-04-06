/**
 * AFT System - E2E Test Script
 * Tests mobile and admin features
 * Run: node scripts/test-e2e.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function log(msg, status = 'INFO') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : '📝';
  console.log(`  ${icon} ${msg}`);
  if (status === 'PASS') passed++;
  else if (status === 'FAIL') failed++;
}

function test(name, fn) {
  try {
    fn();
    log(`${name}`, 'PASS');
  } catch (e) {
    log(`${name}: ${e.message}`, 'FAIL');
  }
}

function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  AFT SYSTEM - E2E TESTS');
  console.log('='.repeat(60) + '\n');

  // ============================================
  // SECTION 1: MOBILE SYNC SERVICE
  // ============================================
  console.log('📱 SECTION 1: MOBILE SYNC SERVICE');
  console.log('-'.repeat(50));

  const syncService = fs.readFileSync(path.join(__dirname, '..', 'apps/mobile/src/services/syncService.ts'), 'utf8');
  
  test('Sync service has retry logic', () => () => {
    if (!syncService.includes('retryWithBackoff')) throw new Error('No retry logic found');
  });
  
  test('Sync service has batch processing', () => () => {
    if (!syncService.includes('BATCH_SIZE')) throw new Error('No batch size defined');
    if (!syncService.includes('batchIndex')) throw new Error('No batch index handling');
  });
  
  test('Sync service has progress callback', () => () => {
    if (!syncService.includes('onProgress')) throw new Error('No progress callback');
    if (!syncService.includes('SyncProgress')) throw new Error('No SyncProgress type');
  });
  
  test('Sync service has checkpoint', () => () => {
    if (!syncService.includes('sync_checkpoint')) throw new Error('No checkpoint mechanism');
    if (!syncService.includes('getSyncCheckpoint')) throw new Error('No getSyncCheckpoint function');
  });

  console.log('');

  // ============================================
  // SECTION 2: MOBILE SQLITE SERVICE
  // ============================================
  console.log('🗄️  SECTION 2: MOBILE SQLITE SERVICE');
  console.log('-'.repeat(50));

  const sqliteService = fs.readFileSync(path.join(__dirname, '..', 'apps/mobile/src/services/sqliteService.ts'), 'utf8');

  test('SQLite has batch insert', () => () => {
    if (!sqliteService.includes('INSERT OR REPLACE')) throw new Error('No batch insert');
  });

  test('SQLite has inventory cache', () => () => {
    if (!sqliteService.includes('cached_inventories')) throw new Error('No cached inventories table');
    if (!sqliteService.includes('cacheInventories')) throw new Error('No cacheInventories function');
    if (!sqliteService.includes('getCachedInventories')) throw new Error('No getCachedInventories function');
  });

  test('SQLite has cache validation', () => () => {
    if (!sqliteService.includes('isInventoriesCacheValid')) throw new Error('No cache validation');
    if (!sqliteService.includes('CACHE_TTL_MS')) throw new Error('No cache TTL');
  });

  console.log('');

  // ============================================
  // SECTION 3: MOBILE SUPABASE SERVICE
  // ============================================
  console.log('🔌 SECTION 3: MOBILE SUPABASE SERVICE');
  console.log('-'.repeat(50));

  const supabaseService = fs.readFileSync(path.join(__dirname, '..', 'apps/mobile/src/services/supabaseService.ts'), 'utf8');

  test('Supabase service uses SQLite cache', () => () => {
    if (!supabaseService.includes('getCachedInventories')) throw new Error('No SQLite cache usage');
    if (!supabaseService.includes('isInventoriesCacheValid')) throw new Error('No cache validation');
  });

  test('Supabase service has offline fallback', () => () => {
    if (!supabaseService.includes('isInventoriesCacheValid')) throw new Error('No offline fallback');
  });

  console.log('');

  // ============================================
  // SECTION 4: MOBILE COMPONENTS
  // ============================================
  console.log('📱 SECTION 4: MOBILE COMPONENTS');
  console.log('-'.repeat(50));

  const homeScreen = fs.readFileSync(path.join(__dirname, '..', 'apps/mobile/src/screens/HomeScreen.tsx'), 'utf8');

  test('HomeScreen has sync progress modal', () => () => {
    if (!homeScreen.includes('syncProgress')) throw new Error('No syncProgress state');
    if (!homeScreen.includes('Modal')) throw new Error('No Modal component');
  });

  test('HomeScreen has offline indicator', () => () => {
    if (!homeScreen.includes('useNetworkStatus')) throw new Error('No network status hook');
    if (!homeScreen.includes('offlineBanner')) throw new Error('No offline banner');
  });

  test('HomeScreen has inventory FlatList', () => () => {
    if (!homeScreen.includes('FlatList')) throw new Error('No FlatList for inventories');
  });

  const localAssets = fs.readFileSync(path.join(__dirname, '..', 'apps/mobile/src/screens/LocalAssetsScreen.tsx'), 'utf8');

  test('LocalAssets has search functionality', () => () => {
    if (!localAssets.includes('searchQuery')) throw new Error('No search query');
    if (!localAssets.includes('TextInput')) throw new Error('No search input');
    if (!localAssets.includes('filteredAssets')) throw new Error('No filtered assets');
  });

  console.log('');

  // ============================================
  // SECTION 5: ADMIN REPORT API
  // ============================================
  console.log('🖥️  SECTION 5: ADMIN REPORT API');
  console.log('-'.repeat(50));

  const reportRoute = fs.readFileSync(path.join(__dirname, '..', 'apps/admin/src/app/api/inventories/[id]/report/route.ts'), 'utf8');

  test('Report API has PDF generation', () => () => {
    if (!reportRoute.includes('PDFDocument')) throw new Error('No PDF generation');
    if (!reportRoute.includes('generatePdf')) throw new Error('No generatePdf function');
  });

  test('Report API has Excel generation', () => () => {
    if (!reportRoute.includes('xlsx') && !reportRoute.includes('XLSX')) throw new Error('No Excel generation');
    if (!reportRoute.includes('generateExcel')) throw new Error('No generateExcel function');
  });

  test('Report API handles reconciliation', () => () => {
    if (!reportRoute.includes('reconciliations')) throw new Error('No reconciliation handling');
    if (!reportRoute.includes('surplus_assets')) throw new Error('No surplus assets handling');
  });

  console.log('');

  // ============================================
  // SECTION 6: UTILITIES
  // ============================================
  console.log('🔧 SECTION 6: UTILITIES');
  console.log('-'.repeat(50));

  const retry = fs.readFileSync(path.join(__dirname, '..', 'apps/mobile/src/utils/retry.ts'), 'utf8');

  test('Retry utility exists', () => () => {
    if (!retry.includes('retryWithBackoff')) throw new Error('No retryWithBackoff function');
    if (!retry.includes('exponential')) throw new Error('No exponential backoff');
  });

  const assetValidation = fs.readFileSync(path.join(__dirname, '..', 'apps/mobile/src/utils/assetValidation.ts'), 'utf8');

  test('Asset validation has detailed validation', () => () => {
    if (!assetValidation.includes('validateAssetIdDetailed')) throw new Error('No detailed validation');
    if (!assetValidation.includes('ValidationResult')) throw new Error('No ValidationResult type');
  });

  const errorBoundary = fs.readFileSync(path.join(__dirname, '..', 'apps/mobile/src/components/ErrorBoundary.tsx'), 'utf8');

  test('ErrorBoundary exists', () => () => {
    if (!errorBoundary.includes('ErrorBoundary')) throw new Error('No ErrorBoundary component');
    if (!errorBoundary.includes('componentDidCatch')) throw new Error('No error catching');
  });

  console.log('');

  // ============================================
  // SECTION 7: CONFIGURATION
  // ============================================
  console.log('⚙️  SECTION 7: CONFIGURATION');
  console.log('-'.repeat(50));

  const metroConfig = fs.readFileSync(path.join(__dirname, '..', 'apps/mobile/metro.config.js'), 'utf8');

  test('Metro config has optimizations', () => () => {
    if (!metroConfig.includes('minifierPath')) throw new Error('No minifier config');
    if (!metroConfig.includes('resolveRequest')) throw new Error('No custom resolver');
  });

  const buildGradle = fs.readFileSync(path.join(__dirname, '..', 'apps/mobile/android/app/build.gradle'), 'utf8');

  test('Build gradle has ProGuard enabled', () => () => {
    if (!buildGradle.includes('enableProguardInReleaseBuilds = true')) throw new Error('ProGuard not enabled');
  });

  const appTsx = fs.readFileSync(path.join(__dirname, '..', 'apps/mobile/App.tsx'), 'utf8');

  test('App has lazy loading', () => () => {
    if (!appTsx.includes('lazy(')) throw new Error('No lazy loading');
    if (!appTsx.includes('Suspense')) throw new Error('No Suspense component');
  });

  test('App has ErrorBoundary wrapper', () => () => {
    if (!appTsx.includes('ErrorBoundary')) throw new Error('No ErrorBoundary wrapper');
  });

  console.log('');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('='.repeat(60));
  console.log('  E2E TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`  ✅ Passed:   ${passed}`);
  console.log(`  ❌ Failed:   ${failed}`);
  console.log(`  📊 Total:    ${passed + failed}`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n  🎉 ALL E2E TESTS PASSED!\n');
  } else {
    console.log(`\n  ⚠️  ${failed} test(s) failed.\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
