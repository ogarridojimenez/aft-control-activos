import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen, type RootStackParamList } from './src/screens/HomeScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { QrScannerScreen } from './src/screens/QrScannerScreen';
import { LocalAssetsScreen } from './src/screens/LocalAssetsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'AFT' }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Escaneo' }} />
        <Stack.Screen name="LocalAssets" component={LocalAssetsScreen} options={{ title: 'Activos descargados' }} />
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
              <QrScannerScreen
                inventoryId={route.params.inventoryId}
                onScanSuccess={(code: string) => {
                  const parent = route.params.onScanSuccess;
                  if (parent) parent(code);
                }}
                onBack={() => props.navigation.goBack()}
              />
            );
          }}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
