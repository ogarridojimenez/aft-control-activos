# 🚨 Soluciones para Problemas de Ejecución - Expo Go y Android Studio

## 📋 Problemas Identificados

### 1. ❌ Conflictos de Versiones de React Native
**Síntoma:** Múltiples versiones de React Native causando conflictos
- React Native 0.74.5 (versión principal)
- React Native 0.84.1 (desde @expo/metro-runtime y @expo/vector-icons)

### 2. ❌ Versión Incompatible de TypeScript
**Síntoma:** TypeScript 5.9.3 instalado, pero Expo SDK 51 requiere ~5.3.3

### 3. ❌ JAVA_HOME No Configurado
**Síntoma:** Error "JAVA_HOME is not set" al ejecutar Gradle

### 4. ⚠️ Configuración de Metro Problemática
**Síntoma:** Advertencias de expo-doctor sobre watchFolders

### 5. ⚠️ Problemas de Prebuild Configuration
**Síntoma:** Conflicto entre carpetas nativas y configuración en app.json

## 🛠️ Soluciones Paso a Paso

### 🔧 Solución 1: Configurar JAVA_HOME (CRÍTICO)

**Para Windows 10/11:**

1. **Descargar JDK 17** (recomendado para React Native 0.74.x):
   - https://adoptium.net/temurin/releases/?version=17
   - Instalar en `C:\Program Files\Java\jdk-17.x.x`

2. **Configurar Variables de Entorno:**
   - Abrir "Editar las variables de entorno del sistema"
   - **Nueva Variable de Sistema:**
     - Nombre: `JAVA_HOME`
     - Valor: `C:\Program Files\Java\jdk-17.x.x` (ruta exacta de instalación)
   - **Modificar Variable PATH:**
     - Agregar: `%JAVA_HOME%\bin`

3. **Verificar Configuración:**
   ```cmd
   echo %JAVA_HOME%
   java -version
   javac -version
   ```

### 🔧 Solución 2: Resolver Conflictos de Dependencias

```bash
cd apps/mobile

# 1. Eliminar dependencias problemáticas
npm uninstall @expo/metro-runtime

# 2. Verificar y corregir dependencias
npx expo install --check

# 3. Instalar versión correcta de TypeScript
npx expo install typescript@~5.3.3

# 4. Limpiar y reinstalar
rm -rf node_modules
rm package-lock.json
npm install
```

### 🔧 Solución 3: Optimizar Metro Configuration

**Modificar `apps/mobile/metro.config.js`:**

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuración optimizada y compatible
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

// Remove problematic watchFolders configuration
// config.watchFolders = [workspaceRoot];
// config.resolver.nodeModulesPaths = [
//   path.resolve(projectRoot, 'node_modules'),
//   path.resolve(workspaceRoot, 'node_modules'),
// ];

module.exports = config;
```

### 🔧 Solución 4: Limpieza Completa del Proyecto

```bash
# Desde la raíz del proyecto
cd apps/mobile

# 1. Limpiar caches
npm cache clean --force
npx expo prebuild --clean

# 2. Eliminar node_modules y locks
rm -rf node_modules
rm package-lock.json

# 3. Limpiar Android
cd android
./gradlew clean
cd ..

# 4. Reinstalar todo
npm install

# 5. Verificar con expo-doctor
npx expo-doctor
```

### 🔧 Solución 5: Configuración de Android Studio

1. **Abrir Android Studio**
2. **Tools → SDK Manager**
3. **Verificar instalaciones:**
   - Android SDK Platform 34
   - Build-Tools 34.0.0  
   - NDK (Side by side) 26.1.10909125
   - Android SDK Command-line Tools

4. **Asegurar que el PATH incluya:**
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

## 🧪 Verificación de Soluciones

### Prueba 1: Verificar Java
```bash
java -version
# Debe mostrar: openjdk version "17.x.x"

echo %JAVA_HOME%
# Debe mostrar la ruta correcta del JDK 17
```

### Prueba 2: Verificar Gradle
```bash
cd apps/mobile/android
./gradlew --version
# Debe ejecutarse sin errores
```

### Prueba 3: Verificar Dependencias
```bash
cd apps/mobile
npx expo install --check
# No debe mostrar dependencias incompatibles

npx expo-doctor
# Debe mostrar menos errores
```

### Prueba 4: Ejecutar Proyecto
```bash
cd apps/mobile

# Opción A: Expo Go
npx expo start

# Opción B: Android Studio
npx expo run:android
```

## 🚨 Soluciones para Errores Comunes

### Error: "Cannot find module"
```bash
# Reinstalar dependencias específicas
npm install react-native@0.74.5 --save-exact
npm install @expo/vector-icons@^14.0.0 --save-exact
```

### Error: "SDK location not found"
```bash
# Configurar ANDROID_HOME
set ANDROID_HOME=C:\Users\[username]\AppData\Local\Android\Sdk
# Agregar al PATH: %ANDROID_HOME%\platform-tools
```

### Error: "Build failed" en Android Studio
1. **File → Invalidate Caches / Restart**
2. **Build → Clean Project**
3. **Build → Rebuild Project**

## 📊 Estado Actual del Proyecto

### ✅ Funcionando Correctamente:
- Variables de entorno (.env) configuradas
- Estructura de monorepo con TurboRepo
- Dependencias principales instaladas

### ⚠️ Necesita Atención:
- Configuración de JAVA_HOME
- Conflictos de versiones de React Native
- Versión de TypeScript incompatible
- Configuración de Metro

## 🔄 Flujo de Trabajo Recomendado

1. **Primero:** Configurar JAVA_HOME y variables de entorno
2. **Luego:** Ejecutar limpieza completa (Solución 4)
3. **Después:** Corregir dependencias (Solución 2)
4. **Finalmente:** Probar ejecución

## 📞 Soporte Adicional

Si los problemas persisten después de aplicar estas soluciones:

1. **Proporcionar logs de error completos**
2. **Verificar versión de Node.js** (recomendado: 18.x)
3. **Revisar antivirus/firewall** que pueda bloquear ejecutables
4. **Probar en otro dispositivo** para descartar problemas de hardware

¡Estas soluciones deberían resolver la mayoría de los problemas de ejecución! 🚀