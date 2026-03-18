/**
 * Floating pills rendered over the map:
 * - Recogidos/Entregados counter (left)
 * - ETA final (left, below counter)
 * - GPS active dot (right)
 */
import { CheckCircle2, Clock } from 'lucide-react-native';
import { Text, View } from 'react-native';

type Props = {
  routeActive: boolean;
  tracking: boolean;
  tipoRuta: 'ida' | 'vuelta';
  statsCompleted: number;
  statsTotal: number;
  etaFinRuta: number | null;
  topOffset: number; // headerHeight + gap
};

export function DriverOverlayPills({
  routeActive,
  tracking,
  tipoRuta,
  statsCompleted,
  statsTotal,
  etaFinRuta,
  topOffset,
}: Props) {
  if (!routeActive) return null;

  return (
    <>
      {/* Left pills: counter + ETA */}
      <View
        style={{
          position: 'absolute',
          top: topOffset,
          left: 16,
          zIndex: 10,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.97)',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 9,
            gap: 7,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <CheckCircle2 size={16} color="#10B981" strokeWidth={2.5} />
          <Text style={{ color: '#1F2937', fontWeight: '700', fontSize: 13 }}>
            {statsCompleted}/{statsTotal}{' '}
            {tipoRuta === 'vuelta' ? 'ENTREGADOS' : 'RECOGIDOS'}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.97)',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 9,
            gap: 7,
            marginTop: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <Clock size={16} color="#10B981" strokeWidth={2.5} />
          <Text style={{ color: '#1F2937', fontWeight: '700', fontSize: 13 }}>
            {etaFinRuta !== null ? `ETA FINAL: ${etaFinRuta} MIN` : 'ETA FINAL: —'}
          </Text>
        </View>
      </View>

      {/* Right pill: GPS dot */}
      {tracking && (
        <View
          style={{
            position: 'absolute',
            top: topOffset + 4,
            right: 12,
            zIndex: 10,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: '#10B981',
              marginRight: 5,
            }}
          />
          <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>
            GPS activo
          </Text>
        </View>
      )}
    </>
  );
}
