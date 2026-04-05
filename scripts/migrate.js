#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Script de migración para AFT
 *
 * Aplica las migraciones SQL en orden a tu proyecto de Supabase.
 *
 * Uso:
 *   node scripts/migrate.js
 *
 * Requiere:
 *   - SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno
 *   - O un archivo .env en la raíz del proyecto
 *
 * Alternativa recomendada:
 *   Usa Supabase CLI: supabase db push
 *   O aplica manualmente desde el Dashboard > SQL Editor
 */

const fs = require('fs');
const path = require('path');

// Intentar cargar dotenv si está disponible
try {
  const dotenvPath = path.resolve(process.cwd(), 'node_modules', 'dotenv', 'config');
  require('dotenv').config();
} catch {
  // dotenv no instalado, usar variables de entorno directamente
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'packages', 'supabase', 'migrations');

async function runMigrations() {
  // Verificar credenciales
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: Credenciales de Supabase no configuradas');
    console.error('');
    console.error('Opciones:');
    console.error('  1. Crear archivo .env en la raíz con:');
    console.error('     SUPABASE_URL=https://tu-proyecto.supabase.co');
    console.error('     SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key');
    console.error('');
    console.error('  2. O aplicar manualmente desde el Dashboard de Supabase:');
    console.error('     - Ve a SQL Editor');
    console.error('     - Ejecuta 001_init.sql');
    console.error('     - Ejecuta 002_rls_policies.sql');
    console.error('');
    console.error('  3. O usa Supabase CLI:');
    console.error('     supabase login');
    console.error('     supabase link --project-ref <tu-project-ref>');
    console.error('     supabase db push');
    process.exit(1);
  }

  // Verificar que exista el directorio de migraciones
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Error: Directorio de migraciones no encontrado: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  // Obtener archivos de migración ordenados
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('⚠️  No se encontraron archivos de migración en:', MIGRATIONS_DIR);
    process.exit(0);
  }

  console.log('📋 Migraciones encontradas:', migrationFiles.join(', '));
  console.log('');
  console.log('⚠️  IMPORTANTE: Este script requiere la API de Supabase.');
  console.log('');
  console.log('Para aplicar las migraciones, tienes estas opciones:');
  console.log('');
  console.log('📌 OPCIÓN 1 - Dashboard (Recomendado para desarrollo):');
  console.log('   1. Ve a: https://app.supabase.com');
  console.log('   2. Selecciona tu proyecto');
  console.log('   3. Ve a SQL Editor > New Query');
  console.log('   4. Copia y pega el contenido de cada archivo .sql en orden');
  console.log('   5. Ejecuta con Run (Ctrl+Enter)');
  console.log('');
  console.log('📌 OPCIÓN 2 - Supabase CLI:');
  console.log('   npm install -g supabase');
  console.log('   supabase login');
  console.log('   supabase link --project-ref <tu-project-ref>');
  console.log('   supabase db push');
  console.log('');
  console.log('📌 OPCIÓN 3 - Instalar @supabase/supabase-js y ejecutar programáticamente:');
  console.log('   npm install @supabase/supabase-js');
  console.log('   Luego re-ejecuta este script');
  console.log('');

  // Mostrar contenido de cada migración para fácil copia/pega
  for (const file of migrationFiles) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 ${file} (${content.split('\n').length} líneas)`);
    console.log('='.repeat(60));
    console.log(content);
    console.log('='.repeat(60));
  }

  console.log('\n✅ Revisa el output anterior y aplica las migraciones en Supabase.');
}

runMigrations().catch(err => {
  console.error('❌ Error inesperado:', err.message);
  process.exit(1);
});
