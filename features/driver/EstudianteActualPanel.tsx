import { Colors } from '@/lib/constants/colors';
import type { EstudianteGeocerca } from '@/lib/services/geocercas.service';
import { MapPin, MessageCircle, UserX, Clock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

type EstudianteActualPanelProps = {
  estudiante: EstudianteGeocerca | null;
  dentroDeZona: boolean;
  distanciaMetros: number | null;
  onMarcarAusente: () => void;
  onCerrar: () => void;
  onChat?: () => void;
};

export function EstudianteActualPanel({
  estudiante,
  dentroDeZona,
  distanciaMetros,
  onMarcarAusente,
  onCerrar,
  onChat,
}: EstudianteActualPanelProps) {
  const [tiempoEnZona, setTiempoEnZona] = useState(0);
  const [slideAnim] = useState(new Animated.Value(300));

  // Timer para contar tiempo en zona
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (dentroDeZona) {
      interval = setInterval(() => {
        setTiempoEnZona((prev) => prev + 1);
      }, 1000);
    } else {
      setTiempoEnZona(0);
    }

    return () => {
      if (interval !== undefined) clearInterval(interval);
    };
  }, [dentroDeZona]);

  // Animación de entrada
  useEffect(() => {
    if (estudiante && dentroDeZona) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estudiante, dentroDeZona]);

  if (!estudiante) return null;

  const formatTiempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: dentroDeZona ? '#10b981' : '#f59e0b' },
            ]}
          />
          <Text style={styles.headerTitle}>
            {dentroDeZona ? 'En la zona' : 'Aproximándose'}
          </Text>
        </View>

        {dentroDeZona && (
          <View style={styles.timerContainer}>
            <Clock size={14} color="#6b7280" strokeWidth={2} />
            <Text style={styles.timerText}>{formatTiempo(tiempoEnZona)}</Text>
          </View>
        )}
      </View>

      {/* Estudiante info */}
      <View style={styles.estudianteInfo}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {estudiante.nombre.charAt(0)}
            {estudiante.apellido.charAt(0)}
          </Text>
        </View>

        <View style={styles.infoTexts}>
          <Text style={styles.nombreText}>{estudiante.nombreCompleto}</Text>
          <View style={styles.paradaRow}>
            <MapPin
              size={14}
              color={Colors.tecnibus[600]}
              strokeWidth={2.5}
            />
            <Text style={styles.paradaText}>
              {estudiante.parada_nombre || 'Parada sin nombre'}
            </Text>
          </View>

          {distanciaMetros !== null && !dentroDeZona && (
            <Text style={styles.distanciaText}>
              {Math.round(distanciaMetros)}m de distancia
            </Text>
          )}
        </View>

        {onChat && (
          <TouchableOpacity style={styles.botonChat} onPress={onChat}>
            <MessageCircle size={20} color={Colors.tecnibus[600]} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {/* Acciones */}
      {dentroDeZona && (
        <View style={styles.accionesContainer}>
          <TouchableOpacity
            style={styles.botonAusente}
            onPress={onMarcarAusente}
            activeOpacity={0.8}
          >
            <UserX size={20} color="#fff" strokeWidth={2.5} />
            <Text style={styles.botonAusenteText}>Marcar Ausente</Text>
          </TouchableOpacity>

          <Text style={styles.ayudaText}>
            Si no marcas ausente, se marcará presente automáticamente al salir
          </Text>
        </View>
      )}

      {!dentroDeZona && (
        <View style={styles.esperandoContainer}>
          <Text style={styles.esperandoText}>
            Esperando llegada a la parada...
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    fontVariant: ['tabular-nums'],
  },
  estudianteInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.tecnibus[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.tecnibus[700],
  },
  infoTexts: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  nombreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  paradaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paradaText: {
    fontSize: 14,
    color: '#6b7280',
  },
  distanciaText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  accionesContainer: {
    gap: 12,
  },
  botonAusente: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  botonAusenteText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  ayudaText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  esperandoContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  esperandoText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  botonChat: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.tecnibus[50],
    borderWidth: 1.5,
    borderColor: Colors.tecnibus[200],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
