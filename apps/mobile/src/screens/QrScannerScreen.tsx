import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Platform } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { sanitizeAssetId, validateAssetId, ASSET_ID_REGEX } from '../utils/assetValidation';
import { addPendingScan, findLocalAssetByCode } from '../services/sqliteService';

interface QrScannerScreenProps {
  inventoryId: string;
  onScanSuccess: (code: string) => void;
  onBack: () => void;
}

export function QrScannerScreen({ inventoryId, onScanSuccess, onBack }: QrScannerScreenProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(true);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const lastScanTime = useRef<number>(0);
  const cooldownMs = 2000;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    const now = Date.now();
    if (now - lastScanTime.current < cooldownMs) return;

    const code = sanitizeAssetId(data);

    if (!ASSET_ID_REGEX.test(code)) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Código no válido', `El código "${data}" no tiene el formato MB + dígitos`);
      return;
    }

    lastScanTime.current = now;
    setLastScanned(code);
    setScanning(false);

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const exists = await findLocalAssetByCode(code);
    if (!exists) {
      Alert.alert(
        'Activo no encontrado',
        `El activo ${code} no está en la lista descargada de esta área. ¿Desea registrarlo de todos modos?`,
        [
          { text: 'Cancelar', onPress: () => { setScanning(true); setLastScanned(null); } },
          {
            text: 'Registrar',
            onPress: async () => {
              await addPendingScan(inventoryId, code);
              onScanSuccess(code);
              setScanning(true);
              setLastScanned(null);
            },
          },
        ]
      );
    } else {
      await addPendingScan(inventoryId, code);
      onScanSuccess(code);
      setScanning(true);
      setLastScanned(null);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Solicitando permiso de cámara…</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={[styles.text, styles.error]}>
          No hay acceso a la cámara. Actívalo en los ajustes del dispositivo.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onBack}>
          <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />
      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.scanText}>
          {scanning ? 'Apunta la cámara al código QR del activo' : 'Procesando…'}
        </Text>
        {lastScanned && (
          <Text style={styles.lastScanned}>Último escaneado: {lastScanned}</Text>
        )}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanText: {
    marginTop: 24,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  lastScanned: {
    marginTop: 8,
    color: '#86efac',
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  error: {
    color: '#fca5a5',
  },
  button: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
