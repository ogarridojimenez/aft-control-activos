# Guía Paso a Paso — Configuración del Entorno de Desarrollo (Fase A)

Esta guía te lleva desde cero hasta tener el sistema AFT funcionando localmente con datos de prueba.

---

## Prerrequisitos

- [ ] Node.js 18+ instalado
- [ ] npm 9+ instalado
- [ ] Cuenta en [Supabase](https://supabase.com) (gratuita es suficiente)
- [ ] (Opcional) Expo Go instalado en tu dispositivo móvil para probar la app

---

## Paso 1: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com) e inicia sesión
2. Click en **"New Project"**
3. Configura:
   - **Organization**: Selecciona o crea una
   - **Name**: `aft-sistema` (o el nombre que prefieras)
   - **Database Password**: Genera una segura y **guárdala**
   - **Region**: Elige la más cercana a tu ubicación
4. Click en **"Create new project"** y espera ~2 minutos

---

## Paso 2: Obtener Credenciales de Supabase

1. En el dashboard de tu proyecto, ve a **Settings** (ícono de engranaje) → **API**
2. Copia estos valores:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbG...` (clave larga que empieza con `eyJ`)
   - **service_role** (secret): `eyJhbG...` (⚠️ **NUNCA** compartir ni commitear)

---

## Paso 3: Aplicar Migraciones de Base de Datos

### Opción A: Desde el Dashboard (Recomendado)

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Click en **"New Query"**
3. Abre el archivo `packages/supabase/migrations/001_init.sql` en tu editor
4. Copia **todo** el contenido y pégalo en el SQL Editor
5. Click en **"Run"** (o Ctrl+Enter)
6. Verifica que no haya errores en la consola inferior
7. Crea una **nueva query** (botón "+")
8. Repite el proceso con `packages/supabase/migrations/002_rls_policies.sql`
9. Click en **"Run"**

### Opción B: Usando Supabase CLI

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login
supabase login

# Vincular con tu proyecto
supabase link --project-ref tu-project-ref

# Aplicar migraciones
supabase db push
```

### Verificación

Ejecuta esta query en el SQL Editor para confirmar que las tablas existen:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Deberías ver: `areas`, `assets`, `user_profiles`, `inventories`, `inventory_items`, `reconciliations`, `offline_sync`

---

## Paso 4: Configurar Variables de Entorno del Admin

1. Ve al directorio del admin:
   ```bash
   cd apps/admin
   ```

2. Copia el archivo de ejemplo:
   ```bash
   cp .env.local.example .env.local
   ```
   (En Windows PowerShell: `Copy-Item .env.local.example .env.local`)

3. Abre `.env.local` y reemplaza los valores:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   ```

4. Guarda el archivo

---

## Paso 5: Configurar Variables de Entorno del Mobile

1. Ve al directorio del mobile:
   ```bash
   cd apps/mobile
   ```

2. Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```
   (En Windows PowerShell: `Copy-Item .env.example .env`)

3. Abre `.env` y reemplaza los valores:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
   EXPO_PUBLIC_ADMIN_API_URL=http://192.168.0.10:3000
   ```

   **Importante para `EXPO_PUBLIC_ADMIN_API_URL`:**
   - **Emulador Android**: `http://10.0.2.2:3000`
   - **Emulador iOS**: `http://localhost:3000`
   - **Dispositivo físico**: `http://<TU_IP>:3000` (tu IP en la red WiFi)
   - Para encontrar tu IP en Windows: abre CMD y ejecuta `ipconfig` → busca "IPv4 Address"

4. Guarda el archivo

---

## Paso 6: Crear Usuario Admin en Supabase Auth

1. En el dashboard de Supabase, ve a **Authentication** → **Users**
2. Click en **"Add User"** → **"Create new user"**
3. Ingresa:
   - **Email**: `admin@ejemplo.com` (o el que prefieras)
   - **Password**: Una contraseña segura (mínimo 6 caracteres)
   - **Auto Confirm User**: ✅ Actívalo (para evitar email de confirmación en desarrollo)
4. Click en **"Create User"**
5. **Copia el UUID** del usuario creado (aparece en la columna "UID")

---

## Paso 7: Insertar Datos de Prueba (Seed)

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Click en **"New Query"**
3. Abre el archivo `packages/supabase/seed/001_seed_data.sql` en tu editor
4. Copia **todo** el contenido y pégalo en el SQL Editor
5. **Antes de ejecutar**, busca y reemplaza `'TU_USER_UUID_AQUI'` con el UUID real que copiaste en el paso 6
6. Click en **"Run"**

### Verificación

Ejecuta estas queries para confirmar:

```sql
-- Debería mostrar 6 áreas
SELECT code, name FROM areas ORDER BY code;

-- Debería mostrar 20+ activos
SELECT asset_id, name, status FROM assets ORDER BY asset_id;

-- Debería mostrar 1 perfil de usuario (el admin)
SELECT full_name, role FROM user_profiles;
```

---

## Paso 8: Instalar Dependencias

Desde la **raíz del monorepo** (`C:\Users\DELL\Desktop\AFT`):

```bash
npm install
```

Esto instalará las dependencias de todos los workspaces (admin, mobile, shared).

---

## Paso 9: Iniciar el Servidor de Desarrollo

### Opción A: Iniciar todo junto (recomendado)

Desde la raíz del monorepo:

```bash
npm run dev
```

Esto inicia simultáneamente:
- **Admin** en `http://localhost:3000`
- **Mobile** (Metro bundler de Expo)

### Opción B: Iniciar por separado

**Solo Admin:**
```bash
cd apps/admin
npm run dev
```

**Solo Mobile:**
```bash
cd apps/mobile
npx expo start
```

---

## Paso 10: Verificar que Todo Funciona

### Portal Admin

1. Abre `http://localhost:3000` en tu navegador
2. Debería redirigirte a `/login`
3. Inicia sesión con las credenciales del Paso 6
4. Deberías ver el dashboard con estadísticas
5. Navega a **Activos** — deberías ver los 20+ activos de prueba
6. Navega a **Inventarios** — debería estar vacío (listo para crear)

### App Mobile

1. Desde la terminal de Expo, escanea el QR con tu dispositivo (Expo Go)
   - O presiona `a` para emulador Android / `i` para iOS
2. Deberías ver la pantalla de login
3. Inicia sesión con las mismas credenciales del admin
4. Selecciona un inventario (si existe) o descarga activos de un área
5. Prueba la entrada manual de un código de activo (ej: `MB00001`)

---

## Checklist Final de Fase A

- [ ] Proyecto Supabase creado
- [ ] Migraciones `001_init.sql` y `002_rls_policies.sql` aplicadas
- [ ] `apps/admin/.env.local` configurado
- [ ] `apps/mobile/.env` configurado
- [ ] Usuario admin creado en Supabase Auth
- [ ] Fila en `user_profiles` con `role = 'admin'`
- [ ] Áreas de prueba insertadas (6 áreas)
- [ ] Activos de prueba insertados (20+ activos)
- [ ] `npm install` ejecutado sin errores
- [ ] Admin accesible en `http://localhost:3000` con login funcional
- [ ] Mobile puede iniciar sesión y ver datos

---

## Solución de Problemas

### Error: "Invalid API key" en el admin
- Verifica que `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` sean correctos
- Asegúrate de que `.env.local` esté en `apps/admin/` (no en la raíz)

### Error: "Row Level Security policy" en el móvil
- El usuario móvil debe tener una fila en `user_profiles` con el `area_id` correcto
- Verifica que el usuario tenga permisos RLS para el área del inventario

### El móvil no puede conectar al admin
- Verifica que `EXPO_PUBLIC_ADMIN_API_URL` use la IP correcta (no localhost para dispositivo físico)
- Asegúrate de que ambos dispositivos estén en la misma red WiFi
- Verifica que el firewall de Windows no bloquee el puerto 3000

### Error: "relation areas does not exist"
- Las migraciones no se aplicaron correctamente
- Ve al SQL Editor de Supabase y re-ejecuta `001_init.sql`

### El login no funciona
- Verifica que el usuario esté **confirmado** en Auth (no pendiente de email)
- En desarrollo, activa "Auto Confirm User" al crear el usuario

---

## Siguiente Paso: Fase B

Una vez completada la Fase A, el siguiente paso es implementar:

1. **Reportes de conciliación** (PDF/Excel)
2. **Escaneo QR con cámara** en el móvil
3. **Página de detalle de inventario**

Consulta el plan de implementación para más detalles.
