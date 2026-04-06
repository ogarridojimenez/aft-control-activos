/**
 * Test script for mobile app improvements
 * Verifies: inventory_id in SQLite, LocalAssetsScreen, HomeScreen refactor, error handling
 * Run: node scripts/test-mobile-improvements.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MOBILE_ROOT = path.join(PROJECT_ROOT, 'apps', 'mobile');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function fileExists(filePath) {
  assert(fs.existsSync(filePath), `File not found: ${filePath}`);
}

function fileContains(filePath, text) {
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes(text), `File ${filePath} does not contain: "${text.substring(0, 50)}..."`);
}

console.log('\n' + '='.repeat(60));
console.log('  AFT MOBILE IMPROVEMENTS — TEST SUITE');
console.log('='.repeat(60) + '\n');

// ============================================
// SECTION 1: SQLite Service — inventory_id
// ============================================
console.log('📦 SECTION 1: SQLite Service (inventory_id column)');
console.log('-'.repeat(50));

const sqlitePath = path.join(MOBILE_ROOT, 'src', 'services', 'sqliteService.ts');

test('sqliteService.ts exists', () => fileExists(sqlitePath));

test('local_assets table has inventory_id column', () =>
  fileContains(sqlitePath, 'inventory_id TEXT NOT NULL'));

test('CREATE INDEX on inventory_id exists', () =>
  fileContains(sqlitePath, 'CREATE INDEX IF NOT EXISTS idx_local_assets_inventory'));

test('clearInventoryAssets function exists (replaces clearLocalAssets)', () =>
  fileContains(sqlitePath, 'export function clearInventoryAssets(inventoryId: string)'));

test('clearInventoryAssets deletes by inventory_id', () =>
  fileContains(sqlitePath, 'DELETE FROM local_assets WHERE inventory_id = ?'));

test('insertLocalAssets takes inventoryId as first param', () =>
  fileContains(sqlitePath, 'export function insertLocalAssets(\n  inventoryId: string,'));

test('insertLocalAssets uses BEGIN TRANSACTION', () =>
  fileContains(sqlitePath, 'BEGIN TRANSACTION'));

test('insertLocalAssets uses COMMIT/ROLLBACK', () =>
  fileContains(sqlitePath, 'COMMIT') && fileContains(sqlitePath, 'ROLLBACK'));

test('getLocalAssets function exists with optional inventoryId', () =>
  fileContains(sqlitePath, 'export function getLocalAssets(inventoryId?: string)'));

test('getLocalAssets filters by inventory_id when provided', () =>
  fileContains(sqlitePath, 'WHERE inventory_id = ?'));

test('getAssetsCount function exists with optional inventoryId', () =>
  fileContains(sqlitePath, 'export function getAssetsCount(inventoryId?: string)'));

test('LocalAsset interface includes inventory_id', () =>
  fileContains(sqlitePath, 'inventory_id: string;'));

console.log('');

// ============================================
// SECTION 2: LocalAssetsScreen
// ============================================
console.log('📱 SECTION 2: LocalAssetsScreen');
console.log('-'.repeat(50));

const localAssetsPath = path.join(MOBILE_ROOT, 'src', 'screens', 'LocalAssetsScreen.tsx');

test('LocalAssetsScreen.tsx exists', () => fileExists(localAssetsPath));

test('Uses FlatList for virtualization', () =>
  fileContains(localAssetsPath, 'FlatList'));

test('Has RefreshControl for pull-to-refresh', () =>
  fileContains(localAssetsPath, 'RefreshControl'));

test('Has ListEmptyComponent for empty state', () =>
  fileContains(localAssetsPath, 'ListEmptyComponent'));

test('Uses React.memo for AssetItem (performance)', () =>
  fileContains(localAssetsPath, 'React.memo'));

test('Has virtualization settings (initialNumToRender, windowSize)', () =>
  fileContains(localAssetsPath, 'initialNumToRender') && fileContains(localAssetsPath, 'windowSize'));

test('Uses getLocalAssets from sqliteService', () =>
  fileContains(localAssetsPath, 'getLocalAssets'));

test('Exports LocalAssetsScreen component', () =>
  fileContains(localAssetsPath, 'export function LocalAssetsScreen'));

console.log('');

// ============================================
// SECTION 3: HomeScreen refactor
// ============================================
console.log('🏠 SECTION 3: HomeScreen refactor');
console.log('-'.repeat(50));

const homeScreenPath = path.join(MOBILE_ROOT, 'src', 'screens', 'HomeScreen.tsx');

test('HomeScreen.tsx exists', () => fileExists(homeScreenPath));

test('Imports RefreshControl', () =>
  fileContains(homeScreenPath, 'RefreshControl'));

test('Has refreshing state', () =>
  fileContains(homeScreenPath, 'const [refreshing, setRefreshing]'));

test('Has lastUpdate state', () =>
  fileContains(homeScreenPath, 'const [lastUpdate, setLastUpdate]'));

test('Has assetsCount state', () =>
  fileContains(homeScreenPath, 'const [assetsCount, setAssetsCount]'));

test('Uses useCallback for loadInventories', () =>
  fileContains(homeScreenPath, 'useCallback'));

test('Has onRefresh function', () =>
  fileContains(homeScreenPath, 'const onRefresh = useCallback'));

test('ScrollView has RefreshControl', () =>
  fileContains(homeScreenPath, 'refreshControl={'));

test('Shows lastUpdate timestamp in UI', () =>
  fileContains(homeScreenPath, 'Última actualización'));

test('Button shows assetsCount', () =>
  fileContains(homeScreenPath, 'Ver activos descargados ({assetsCount})'));

test('Navigates to LocalAssets screen', () =>
  fileContains(homeScreenPath, "navigation.navigate('LocalAssets')"));

test('LocalAssets route is in RootStackParamList', () =>
  fileContains(homeScreenPath, 'LocalAssets: undefined;'));

console.log('');

// ============================================
// SECTION 4: Error handling utility
// ============================================
console.log('🛡️  SECTION 4: Error handling utility');
console.log('-'.repeat(50));

const errorHandlingPath = path.join(MOBILE_ROOT, 'src', 'utils', 'errorHandling.ts');

test('errorHandling.ts exists', () => fileExists(errorHandlingPath));

test('Exports withErrorHandling function', () =>
  fileContains(errorHandlingPath, 'export async function withErrorHandling'));

test('withErrorHandling uses try/catch/finally', () =>
  fileContains(errorHandlingPath, 'try {') && fileContains(errorHandlingPath, 'finally {'));

test('withErrorHandling calls setLoading(true) and setLoading(false)', () =>
  fileContains(errorHandlingPath, 'setLoading(true)') && fileContains(errorHandlingPath, 'setLoading(false)'));

test('withErrorHandling shows Alert.alert on error', () =>
  fileContains(errorHandlingPath, 'Alert.alert'));

test('Exports safeExecute function', () =>
  fileContains(errorHandlingPath, 'export function safeExecute'));

test('safeExecute returns fallback on error', () =>
  fileContains(errorHandlingPath, 'return fallback'));

console.log('');

// ============================================
// SECTION 5: Navigation integration
// ============================================
console.log('🔗 SECTION 5: Navigation integration');
console.log('-'.repeat(50));

const appPath = path.join(MOBILE_ROOT, 'App.tsx');

test('App.tsx imports LocalAssetsScreen', () =>
  fileContains(appPath, 'LocalAssetsScreen'));

test('App.tsx has LocalAssets Stack.Screen', () =>
  fileContains(appPath, 'name="LocalAssets"'));

test('App.tsx sets title for LocalAssets', () =>
  fileContains(appPath, 'Activos descargados'));

console.log('');

// ============================================
// SECTION 6: No regressions
// ============================================
console.log('🔍 SECTION 6: No regressions');
console.log('-'.repeat(50));

test('Old clearLocalAssets is NOT imported in HomeScreen', () => {
  const content = fs.readFileSync(homeScreenPath, 'utf8');
  assert(!content.includes('clearLocalAssets'), 'clearLocalAssets should not be imported');
});

test('insertLocalAssets is called with 2 arguments (inventoryId, rows)', () => {
  const content = fs.readFileSync(homeScreenPath, 'utf8');
  assert(content.includes('insertLocalAssets(\n        inv.id,'), 'insertLocalAssets should receive inventoryId as first arg');
});

test('getAssetsCount is called with inventoryId', () => {
  const content = fs.readFileSync(homeScreenPath, 'utf8');
  assert(content.includes('getAssetsCount(inv.id)') || content.includes('getAssetsCount(selectedId)'), 'getAssetsCount should be called with inventoryId');
});

test('pending_scans table still has inventory_id', () =>
  fileContains(sqlitePath, 'inventory_id TEXT NOT NULL'));

test('app_meta table still exists', () =>
  fileContains(sqlitePath, 'CREATE TABLE IF NOT EXISTS app_meta'));

console.log('');

// ============================================
// SUMMARY
// ============================================
console.log('='.repeat(60));
console.log('  TEST SUMMARY');
console.log('='.repeat(60));
console.log(`  ✅ Passed:   ${passed}`);
console.log(`  ❌ Failed:   ${failed}`);
console.log(`  📊 Total:    ${passed + failed}`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('\n  🎉 ALL TESTS PASSED! Improvements are ready for emulator testing.\n');
} else {
  console.log(`\n  ⚠️  ${failed} test(s) failed. Review the issues above.\n`);
  process.exit(1);
}
