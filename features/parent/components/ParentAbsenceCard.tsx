/**
 * Card shown inside the bottom sheet when the student is marked absent.
 * Replaces the TodayTimeline for absent students.
 */
import { UserX } from 'lucide-react-native';
import { Text, View } from 'react-native';

type Props = {
  tipoRuta: 'ida' | 'vuelta';
  nombreEstudiante: string | undefined;
  marcadoPorChofer: boolean;
};

export function ParentAbsenceCard({ tipoRuta, nombreEstudiante, marcadoPorChofer }: Props) {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        marginHorizontal: 16,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#FEF2F2',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <UserX size={32} color="#DC2626" strokeWidth={1.5} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '700', color: '#1F2937' }}>
        Estudiante ausente hoy
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: '#6B7280',
          textAlign: 'center',
          marginTop: 8,
          lineHeight: 18,
        }}
      >
        {nombreEstudiante || 'El estudiante'}{' '}
        {tipoRuta === 'vuelta' ? 'no será entregado' : 'no sera recogido'} por la buseta hoy.
        {'\n'}
        {marcadoPorChofer
          ? 'Fue marcado ausente por el chofer.'
          : 'Si cambias de opinion, puedes reactivar la asistencia arriba.'}
      </Text>
    </View>
  );
}
