import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Suspense, lazy, type ReactNode } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { HomeScreen, type RootStackParamList } from './src/screens/HomeScreen';

const ScanScreen = lazy(() => import('./src/screens/ScanScreen').then(m => ({ default: m.ScanScreen })));
const QrScannerScreen = lazy(() => import('./src/screens/QrScannerScreen').then(m => ({ default: m.QrScannerScreen })));
const LocalAssetsScreen = lazy(() => import('./src/screens/LocalAssetsScreen').then(m => ({ default: m.LocalAssetsScreen })));

const Stack = createNativeStackNavigator<RootStackParamList>();

function ScreenLoader(): ReactNode {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={styles.loaderText}>Cargando...</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1e3a5f' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="Home" options={{ title: 'AFT' }}>
          {(props) => (
            <ErrorBoundary>
              <HomeScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="Scan" options={{ title: 'Escaneo' }}>
          {(props) => (
            <ErrorBoundary>
              <Suspense fallback={<ScreenLoader />}>
                <ScanScreen {...props} />
              </Suspense>
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="LocalAssets" options={{ title: 'Activos descargados' }}>
          {(props) => (
            <ErrorBoundary>
              <Suspense fallback={<ScreenLoader />}>
                <LocalAssetsScreen {...props} />
              </Suspense>
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="QrScanner"
          options={{
            title: 'Escanear QR',
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        >
          {(props) => {
            const { route } = props;
            return (
              <ErrorBoundary>
                <Suspense fallback={<ScreenLoader />}>
                  <QrScannerScreen
                    inventoryId={route.params.inventoryId}
                    onScanSuccess={(code: string) => {
                      const parent = route.params.onScanSuccess;
                      if (parent) parent(code);
                    }}
                    onBack={() => props.navigation.goBack()}
                  />
                </Suspense>
              </ErrorBoundary>
            );
          }}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
});
