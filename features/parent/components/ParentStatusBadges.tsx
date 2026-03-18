/**
 * Overlaid badge area below the header.
 * Shows one of three states:
 *   1. Recogido/Entregado — green check
 *   2. Ausente — red X
 *   3. En camino / En espera — RecorridoStatusBadge + ETA
 * Plus optional student-selector chip (when parent has >1 child).
 */
import { Colors } from '@/lib/constants/colors';
import { EstimatedArrivalBadge } from '../EstimatedArrivalBadge';
import { RecorridoStatusBadge } from '../RecorridoStatusBadge';
import { CheckCircle2, ChevronDown, GraduationCap, UserX } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { haptic } from '@/lib/utils/haptics';
import type { EstudianteDelPadre } from '@/lib/services/padres.service';

type Props = {
  tipoRuta: 'ida' | 'vuelta';
  estudianteRecogido: boolean;
  isAttending: boolean;
  marcadoPorChofer: boolean;
  choferEnCamino: boolean;
  estimatedMinutes: number | null;
  etaColegio: number | null;
  horaRecogida: string | null;
  estudiantes: EstudianteDelPadre[];
  estudianteSeleccionado: EstudianteDelPadre | null;
  onOpenStudentSelector: () => void;
};

function ParentStatusBadgesComponent({
  tipoRuta,
  estudianteRecogido,
  isAttending,
  marcadoPorChofer,
  choferEnCamino,
  estimatedMinutes,
  etaColegio,
  horaRecogida,
  estudiantes,
  estudianteSeleccionado,
  onOpenStudentSelector,
}: Props) {
  const handleSelectorPress = useCallback(() => {
    haptic.light();
    onOpenStudentSelector();
  }, [onOpenStudentSelector]);

  return (
    <View>
      {/* ── Badge: student picked up / delivered ── */}
      {estudianteRecogido ? (
        <View style={{ gap: 8 }}>
          <View
            style={{
              marginLeft: 16,
              marginTop: 8,
              alignSelf: 'flex-start',
              backgroundColor: '#ECFDF5',
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <CheckCircle2 size={18} color="#059669" strokeWidth={2.5} />
            <View style={{ marginLeft: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#065F46' }}>
                {tipoRuta === 'vuelta' ? 'Ya fue entregado' : 'Ya fue recogido'}
              </Text>
              <Text style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>
                {tipoRuta === 'vuelta'
                  ? horaRecogida
                    ? `Entregado a las ${horaRecogida}`
                    : 'La buseta lo entregó en su parada'
                  : horaRecogida
                  ? `Recogido a las ${horaRecogida}`
                  : 'La buseta lo recogió correctamente'}
              </Text>
            </View>
          </View>
          {tipoRuta === 'ida' && etaColegio !== null && (
            <EstimatedArrivalBadge
              minutes={etaColegio}
              onSchedule={choferEnCamino}
              label="al colegio"
            />
          )}
        </View>
      ) : !isAttending ? (
        /* ── Badge: absent ── */
        <View
          style={{
            marginLeft: 16,
            marginTop: 8,
            alignSelf: 'flex-start',
            backgroundColor: '#FEF2F2',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <UserX size={18} color="#DC2626" strokeWidth={2.5} />
          <View style={{ marginLeft: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#991B1B' }}>
              {tipoRuta === 'vuelta' ? 'No será entregado hoy' : 'No sera recogido hoy'}
            </Text>
            <Text style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>
              {marcadoPorChofer ? 'Marcado ausente por el chofer' : 'Marcado ausente por ti'}
            </Text>
          </View>
        </View>
      ) : (
        /* ── Badge: en camino / en espera ── */
        <>
          <RecorridoStatusBadge isActive={choferEnCamino} />
          {choferEnCamino && estimatedMinutes !== null && (
            <EstimatedArrivalBadge
              minutes={estimatedMinutes}
              onSchedule={choferEnCamino}
              label={tipoRuta === 'vuelta' ? 'a tu parada' : 'a tu parada'}
            />
          )}
        </>
      )}

      {/* ── Student selector chip (only when >1 child) ── */}
      {estudiantes.length > 1 && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSelectorPress}
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 12,
            paddingVertical: 8,
            paddingHorizontal: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <GraduationCap size={16} color={Colors.tecnibus[600]} strokeWidth={2.5} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: Colors.tecnibus[800],
              marginLeft: 6,
            }}
          >
            {estudianteSeleccionado?.nombre || 'Seleccionar'}
          </Text>
          <ChevronDown
            size={14}
            color={Colors.tecnibus[500]}
            strokeWidth={2.5}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Memoized: badge state changes on attendance/geofence events, not on
 * every bus position update.  Wrapping in memo prevents re-renders caused
 * by ubicacionBus updates flowing through the parent screen.
 */
export const ParentStatusBadges = memo(ParentStatusBadgesComponent);
