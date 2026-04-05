#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Script de seed para AFT
 *
 * Inserta datos de prueba en tu base de datos de Supabase:
 *   - 6 áreas de inventario
 *   - 20+ activos fijos de ejemplo
 *   - Plantillas para usuarios (requiere UUID de Auth)
 *
 * Uso:
 *   node scripts/seed.js
 *
 * Requiere:
 *   - SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno
 *   - Migraciones ya aplicadas (001_init.sql, 002_rls_policies.sql)
 *   - Al menos un usuario creado en Supabase Auth
 *
 * Alternativa recomendada:
 *   Ejecuta packages/supabase/seed/001_seed_data.sql manualmente
 *   desde el Dashboard > SQL Editor de Supabase
 */

const fs = require('fs');
const path = require('path');

// Intentar cargar dotenv si está disponible
try {
  require('dotenv').config();
} catch {
  // dotenv no instalado, usar variables de entorno directamente
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SEED_FILE = path.resolve(__dirname, '..', 'packages', 'supabase', 'seed', '001_seed_data.sql');

async function runSeed() {
  // Verificar credenciales
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: Credenciales de Supabase no configuradas');
    console.error('');
    console.error('Crea un archivo .env en la raíz con:');
    console.error('  SUPABASE_URL=https://tu-proyecto.supabase.co');
    console.error('  SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key');
    console.error('');
    console.error('O aplica el seed manualmente desde el Dashboard > SQL Editor:');
    console.error('  packages/supabase/seed/001_seed_data.sql');
    process.exit(1);
  }

  // Verificar que exista el archivo de seed
  if (!fs.existsSync(SEED_FILE)) {
    console.error(`❌ Error: Archivo de seed no encontrado: ${SEED_FILE}`);
    console.error('');
    console.error('Asegúrate de que el archivo exista en:');
    console.error('  packages/supabase/seed/001_seed_data.sql');
    process.exit(1);
  }

  const seedContent = fs.readFileSync(SEED_FILE, 'utf-8');

  console.log('📋 Archivo de seed encontrado:', SEED_FILE);
  console.log(`   ${seedContent.split('\n').length} líneas`);
  console.log('');
  console.log('⚠️  IMPORTANTE: Antes de ejecutar el seed:');
  console.log('');
  console.log('   1. Crea un usuario en Supabase Auth (Dashboard > Authentication > Users)');
  console.log('   2. Copia el UUID del usuario creado');
  console.log('   3. Reemplaza "TU_USER_UUID_AQUI" en el archivo SQL con el UUID real');
  console.log('');
  console.log('Para aplicar el seed, tienes estas opciones:');
  console.log('');
  console.log('📌 OPCIÓN 1 - Dashboard (Recomendado):');
  console.log('   1. Ve a: https://app.supabase.com');
  console.log('   2. Selecciona tu proyecto');
  console.log('   3. Ve a SQL Editor > New Query');
  console.log('   4. Copia y pega el contenido del archivo de seed');
  console.log('   5. Reemplaza TU_USER_UUID_AQUI con tu UUID real');
  console.log('   6. Ejecuta con Run (Ctrl+Enter)');
  console.log('');
  console.log('📌 OPCIÓN 2 - Supabase CLI:');
  console.log('   supabase db execute -f packages/supabase/seed/001_seed_data.sql');
  console.log('');
  console.log('📌 OPCIÓN 3 - Instalar @supabase/supabase-js y ejecutar programáticamente:');
  console.log('   npm install @supabase/supabase-js');
  console.log('   Luego re-ejecuta este script');
  console.log('');
  console.log('='.repeat(60));
  console.log('📄 Contenido del archivo de seed:');
  console.log('='.repeat(60));
  console.log(seedContent);
  console.log('='.repeat(60));
  console.log('');
  console.log('✅ Revisa el output y aplica el seed en Supabase.');
}

runSeed().catch(err => {
  console.error('❌ Error inesperado:', err.message);
  process.exit(1);
});
