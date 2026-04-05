import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from './HomeScreen';
import { sanitizeAssetId, validateAssetId } from '@aft/shared';
import { findLocalAssetByCode, addPendingScan } from '../services/sqliteService';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

export function ScanScreen({ route, navigation }: Props) {
  const { inventoryId } = route.params;
  const [raw, setRaw] = useState('');
  const [last, setLast] = useState<string | null>(null);

  function onRegister() {
    const code = sanitizeAssetId(raw);
    if (!validateAssetId(code)) {
      Alert.alert('ID inválido', 'Debe ser MB seguido de 5 o más dígitos.');
      return;
    }
    const local = findLocalAssetByCode(code);
    if (!local) {
      Alert.alert(
        'No en lista local',
        `${code} no está en la descarga actual. Aún puedes registrarlo como escaneo (posible sobrante al sincronizar).`
      );
    }
    addPendingScan(inventoryId, code);
    setLast(code);
    setRaw('');
  }

  function onOpenCamera() {
    navigation.navigate('QrScanner', {
      inventoryId,
      onScanSuccess: (code: string) => {
        setLast(code);
      },
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Escaneo de activos</Text>
      <Text style={styles.sub}>
        Inventario:{'\n'}
        <Text style={styles.mono}>{inventoryId}</Text>
      </Text>

      {/* Camera button */}
      <Pressable style={styles.cameraBtn} onPress={onOpenCamera}>
        <Text style={styles.cameraBtnText}>📷 Abrir cámara para escanear QR</Text>
      </Pressable>

      <Text style={styles.divider}>— o ingreso manual —</Text>

      <Text style={styles.sub}>
        Escribe el código leído del QR o pégalo.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Ej: MB00001"
        autoCapitalize="characters"
        value={raw}
        onChangeText={setRaw}
      />
      <Pressable style={styles.btn} onPress={onRegister}>
        <Text style={styles.btnText}>Registrar escaneo</Text>
      </Pressable>

      {last && (
        <Text style={styles.ok}>
          Último registrado: <Text style={styles.mono}>{last}</Text>
        </Text>
      )}

      <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => navigation.goBack()}>
        <Text style={styles.btnGhostText}>Volver</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  sub: { marginTop: 10, color: '#475569', lineHeight: 20 },
  mono: { fontFamily: 'monospace', fontSize: 12, color: '#0f172a' },
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  btn: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#94a3b8', marginTop: 24 },
  btnGhostText: { color: '#334155', fontWeight: '600' },
  ok: { marginTop: 16, color: '#15803d', fontWeight: '500' },
  cameraBtn: {
    marginTop: 16,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cameraBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  divider: { marginTop: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 },
});
