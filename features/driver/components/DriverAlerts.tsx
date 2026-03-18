/**
 * Overlay alerts rendered above the map:
 * - Route deviation banner (top-right)
 * - GPS permission error (above bottom card)
 * - Full-screen "Optimizando ruta" overlay
 */
import { Colors } from '@/lib/constants/colors';
import { AlertTriangle } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type Props = {
  routeActive: boolean;
  desviado: boolean;
  distanciaDesvio: number | null;
  errorGPS: string | null;
  optimizandoRuta: boolean;
  topOffset: number;        // headerHeight + gap for deviation badge
  bottomCardBottom: number; // bottom offset of the card (GPS error floats above it)
};

export function DriverAlerts({
  routeActive,
  desviado,
  distanciaDesvio,
  errorGPS,
  optimizandoRuta,
  topOffset,
  bottomCardBottom,
}: Props) {
  return (
    <>
      {/* Route deviation badge */}
      {routeActive && desviado && (
        <View
          style={{
            position: 'absolute',
            top: topOffset,
            right: 12,
            zIndex: 20,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FEF2F2',
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: '#FCA5A5',
            paddingHorizontal: 12,
            paddingVertical: 7,
            gap: 7,
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <AlertTriangle size={15} color="#DC2626" strokeWidth={2.5} />
          <View>
            <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 12 }}>
              Fuera de ruta
            </Text>
            {distanciaDesvio !== null && (
              <Text style={{ color: '#DC2626', fontSize: 10 }}>
                {Math.round(distanciaDesvio)} m del trayecto
              </Text>
            )}
          </View>
        </View>
      )}

      {/* GPS error */}
      {errorGPS && (
        <View
          style={{
            position: 'absolute',
            bottom: bottomCardBottom + 60,
            left: 16,
            right: 16,
            backgroundColor: '#EF4444',
            padding: 12,
            borderRadius: 16,
            zIndex: 20,
          }}
        >
          <Text
            style={{
              color: '#ffffff',
              fontSize: 13,
              textAlign: 'center',
              fontWeight: '600',
            }}
          >
            {errorGPS}
          </Text>
        </View>
      )}

      {/* Full-screen optimizing overlay */}
      {optimizandoRuta && (
        <View style={styles.optimizingOverlay}>
          <View style={styles.optimizingCard}>
            <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
            <Text style={styles.optimizingTitle}>Optimizando ruta...</Text>
            <Text style={styles.optimizingSubtitle}>
              Calculando mejor recorrido{'\n'}con Google Maps
            </Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  optimizingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  optimizingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  optimizingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 16,
  },
  optimizingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});
