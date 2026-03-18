/**
 * Bottom floating card — shows all driver route states.
 * States: loading, sin-recorrido, pre-recorrido, en-camino, geocerca,
 *         en-camino-al-colegio, todos-entregados-vuelta, ruta-completada.
 */
import { Colors } from '@/lib/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Bus,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Play,
  UserX,
} from 'lucide-react-native';
import { memo } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RecorridoChofer } from '@/lib/services/asignaciones.service';
import type { EstudianteConAsistencia } from '@/lib/services/asistencias.service';
import type { EstudianteGeocerca } from '@/lib/services/geocercas.service';
import type { Parada } from '@/lib/services/rutas.service';
import type { EstadoRecorridoRun } from '@/lib/hooks/useDriverRecorrido';
import { TourStep } from '@/features/tour';
import { haptic } from '@/lib/utils/haptics';

type Props = {
  // Route state
  recorridos: RecorridoChofer[];
  recorridoActual: RecorridoChofer | null;
  estadosRecorridos: Record<string, EstadoRecorridoRun>;
  tipoRuta: 'ida' | 'vuelta';
  routeActive: boolean;
  loadingRecorridos: boolean;
  rutaCompletada: boolean;
  horaLlegadaColegio: string | null;
  loading: boolean;
  processingStudent: string | null;

  // Student data
  estudiantes: EstudianteConAsistencia[];
  paradas: Parada[];
  nextStudent: EstudianteConAsistencia | null;
  estudianteGeocerca: EstudianteGeocerca | null;
  estaEnGeocerca: boolean;
  hayEstudianteActivo: boolean;
  hayCaminoASiguiente: boolean;
  enCaminoAlColegio: boolean;
  todosEntregadosVuelta: boolean;
  estudianteActivoNombre: string | undefined;
  estudianteActivoDireccion: string | null | undefined;
  estudianteActivoId: string | undefined;
  idPadreActivo: string | null;
  etaProximaParada: number | null;
  etaFinRuta: number | null;

  // Position
  bottomOffset: number;

  // Actions
  onIniciarRecorrido: () => void;
  onFinalizarRecorrido: () => Promise<void>;
  onMarcarAusenteGeocerca: () => Promise<void>;
  onDismissCompletada: () => void;
  onCambiarRecorrido: () => void;

  // Setters used for dismiss completada
  setRutaCompletada: (v: boolean) => void;
  setHoraLlegadaColegio: (v: string | null) => void;
  setPolylineCoordinates: (c: { latitude: number; longitude: number }[]) => void;
  setRecorridoActual: (r: RecorridoChofer) => void;
  setShowRecorridoSelector: (v: boolean) => void;
};

function DriverBottomCardComponent({
  recorridos,
  recorridoActual,
  tipoRuta,
  routeActive,
  loadingRecorridos,
  rutaCompletada,
  horaLlegadaColegio,
  loading,
  processingStudent,
  estudiantes,
  paradas,
  nextStudent,
  estaEnGeocerca,
  hayEstudianteActivo,
  hayCaminoASiguiente,
  enCaminoAlColegio,
  todosEntregadosVuelta,
  estudianteActivoNombre,
  estudianteActivoDireccion,
  estudianteActivoId,
  idPadreActivo,
  etaProximaParada,
  etaFinRuta,
  bottomOffset,
  onIniciarRecorrido,
  onFinalizarRecorrido,
  onMarcarAusenteGeocerca,
  setRutaCompletada,
  setHoraLlegadaColegio,
  setPolylineCoordinates,
  setRecorridoActual,
  setShowRecorridoSelector,
}: Props) {
  const router = useRouter();

  return (
    <TourStep
      scope="driver"
      id="driver-card"
      order={2}
      title="Control del Recorrido"
      description="Desde aquí inicias el recorrido, ves al próximo estudiante en ruta, gestionas asistencias y finalizas cuando termines. También puedes navegar directamente a Google Maps."
      style={{
        position: 'absolute',
        left: 30,
        right: 30,
        bottom: bottomOffset,
        zIndex: 5,
      }}
      borderRadius={28}
      padding={0}
    >
      <View
        style={{
          borderRadius: 28,
          shadowColor: Colors.tecnibus[800],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 14,
        }}
      >
        <LinearGradient
          colors={[
            'rgba(235, 248, 255, 0.95)',
            'rgba(244, 250, 253, 0.97)',
            'rgba(255, 255, 255, 0.93)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 28,
            borderWidth: 1,
            borderColor: 'rgba(209, 235, 247, 0.6)',
            paddingHorizontal: 18,
            paddingTop: 16,
            paddingBottom: 16,
          }}
        >
          {/* Inner highlight */}
          <View
            style={{
              position: 'absolute',
              top: 1,
              left: 20,
              right: 20,
              height: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: 1,
            }}
          />

          {/* ── STATE: Ruta completada ── */}
          {rutaCompletada && (
            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#D1FAE5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <CheckCircle2 size={30} color="#10B981" strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1F2937' }}>
                ¡Ruta Completada!
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: '#6B7280',
                  textAlign: 'center',
                  marginTop: 3,
                }}
              >
                {tipoRuta === 'vuelta'
                  ? 'Todos los estudiantes fueron entregados.'
                  : 'Todos los estudiantes llegaron al colegio.'}
              </Text>
              {horaLlegadaColegio && (
                <View
                  style={{
                    marginTop: 10,
                    backgroundColor: '#D1FAE5',
                    borderRadius: 12,
                    paddingVertical: 8,
                    paddingHorizontal: 20,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, color: '#059669' }}>
                    Llegada al colegio
                  </Text>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: '800',
                      color: '#065F46',
                      marginTop: 1,
                    }}
                  >
                    {horaLlegadaColegio}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => {
                  setRutaCompletada(false);
                  setHoraLlegadaColegio(null);
                  setPolylineCoordinates([]);
                }}
                activeOpacity={0.8}
                style={{
                  marginTop: 14,
                  backgroundColor: Colors.tecnibus[600],
                  borderRadius: 14,
                  paddingVertical: 14,
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Bus size={16} color="#ffffff" strokeWidth={2.5} />
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                  Volver al inicio
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STATE: Loading recorridos ── */}
          {!rutaCompletada && loadingRecorridos && (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <ActivityIndicator size="small" color={Colors.tecnibus[600]} />
              <Text style={{ color: '#6B7280', marginTop: 8, fontSize: 14 }}>
                Cargando recorridos...
              </Text>
            </View>
          )}

          {/* ── STATE: Sin recorridos ── */}
          {!rutaCompletada && !loadingRecorridos && recorridos.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Bus size={32} color="#D1D5DB" strokeWidth={1.5} />
              <Text
                style={{
                  color: '#6B7280',
                  marginTop: 8,
                  fontSize: 15,
                  fontWeight: '600',
                }}
              >
                No hay recorridos hoy
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                Contacta al administrador
              </Text>
            </View>
          )}

          {/* ── STATE: Geocerca — estudiante activo ── */}
          {!rutaCompletada &&
            !loadingRecorridos &&
            recorridos.length > 0 &&
            hayEstudianteActivo && (
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      flex: 1,
                      marginRight: 12,
                    }}
                  >
                    <MapPin
                      size={20}
                      color={Colors.tecnibus[600]}
                      strokeWidth={2}
                      style={{ marginTop: 3, marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: '#9CA3AF',
                          fontWeight: '700',
                          letterSpacing: 0.8,
                          textTransform: 'uppercase',
                        }}
                      >
                        Llegando a:
                      </Text>
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: '800',
                          color: '#1F2937',
                          lineHeight: 24,
                          marginTop: 1,
                        }}
                        numberOfLines={1}
                      >
                        {estudianteActivoNombre || '—'}
                      </Text>
                      {estudianteActivoDireccion ? (
                        <Text
                          style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {estudianteActivoDireccion}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', minWidth: 56 }}>
                    {etaProximaParada !== null ? (
                      <>
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: '800',
                            color: Colors.tecnibus[600],
                          }}
                        >
                          ~{etaProximaParada} min
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color: '#9CA3AF',
                            fontWeight: '700',
                            letterSpacing: 0.5,
                          }}
                        >
                          LLEGADA
                        </Text>
                      </>
                    ) : estaEnGeocerca ? (
                      <>
                        <Text
                          style={{ fontSize: 18, fontWeight: '800', color: '#10B981' }}
                        >
                          ¡Ya!
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color: '#9CA3AF',
                            fontWeight: '700',
                          }}
                        >
                          LLEGASTE
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  {tipoRuta === 'ida' && (
                    <TouchableOpacity
                      onPress={onMarcarAusenteGeocerca}
                      disabled={!!processingStudent}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        borderWidth: 1.5,
                        borderColor: '#EF4444',
                        borderRadius: 14,
                        paddingVertical: 13,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        opacity: processingStudent ? 0.55 : 1,
                      }}
                    >
                      {processingStudent === estudianteActivoId ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <>
                          <UserX size={15} color="#EF4444" strokeWidth={2.5} />
                          <Text
                            style={{
                              color: '#EF4444',
                              fontWeight: '700',
                              fontSize: 13,
                              letterSpacing: 0.8,
                            }}
                          >
                            MARCAR AUSENCIA
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  {idPadreActivo && (
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/driver/chat',
                          params: {
                            idPadre: idPadreActivo,
                            idAsignacion: recorridoActual?.id,
                            nombreEstudiante: estudianteActivoNombre,
                          },
                        })
                      }
                      activeOpacity={0.8}
                      style={{
                        width: 50,
                        borderWidth: 1.5,
                        borderColor: Colors.tecnibus[300],
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: Colors.tecnibus[50],
                      }}
                    >
                      <MessageCircle size={20} color={Colors.tecnibus[600]} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

          {/* ── STATE: En camino a siguiente parada ── */}
          {!rutaCompletada &&
            !loadingRecorridos &&
            recorridos.length > 0 &&
            hayCaminoASiguiente && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: Colors.tecnibus[50],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MapPin size={22} color={Colors.tecnibus[600]} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: '#9CA3AF',
                      fontWeight: '700',
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                    }}
                  >
                    En camino a
                  </Text>
                  <Text
                    style={{ fontSize: 16, fontWeight: '800', color: '#1F2937' }}
                    numberOfLines={1}
                  >
                    {nextStudent
                      ? `${nextStudent.nombre} ${nextStudent.apellido}`
                      : '—'}
                  </Text>
                  {nextStudent?.parada && (
                    <Text
                      style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}
                      numberOfLines={1}
                    >
                      {paradas.find((p) => p.id === nextStudent.parada?.id)?.direccion ||
                        nextStudent.parada.nombre}
                    </Text>
                  )}
                </View>
                {etaProximaParada !== null && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: '800',
                        color: Colors.tecnibus[600],
                      }}
                    >
                      ~{etaProximaParada} min
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: '#9CA3AF',
                        fontWeight: '700',
                        letterSpacing: 0.5,
                      }}
                    >
                      LLEGADA
                    </Text>
                  </View>
                )}
                {nextStudent?.id_padre && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/driver/chat',
                        params: {
                          idPadre: nextStudent.id_padre!,
                          idAsignacion: recorridoActual?.id,
                          nombreEstudiante: `${nextStudent.nombre} ${nextStudent.apellido}`,
                        },
                      })
                    }
                    activeOpacity={0.8}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: Colors.tecnibus[50],
                      borderWidth: 1.5,
                      borderColor: Colors.tecnibus[200],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MessageCircle size={20} color={Colors.tecnibus[600]} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            )}

          {/* ── STATE: VUELTA — todos entregados ── */}
          {!rutaCompletada &&
            !loadingRecorridos &&
            recorridos.length > 0 &&
            todosEntregadosVuelta && (
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: '#D1FAE5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <CheckCircle2 size={28} color="#10B981" strokeWidth={2} />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#1F2937' }}>
                  ¡Todos entregados!
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: '#6B7280',
                    textAlign: 'center',
                    marginTop: 4,
                    marginBottom: 14,
                  }}
                >
                  Todos los estudiantes fueron entregados en sus paradas.
                </Text>
                <TouchableOpacity
                  onPress={onFinalizarRecorrido}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: '#10B981',
                    borderRadius: 16,
                    paddingVertical: 14,
                    width: '100%',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <CheckCircle2 size={18} color="#fff" strokeWidth={2.5} />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                    Finalizar recorrido
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          {/* ── STATE: En camino al colegio (IDA) ── */}
          {!rutaCompletada &&
            !loadingRecorridos &&
            recorridos.length > 0 &&
            enCaminoAlColegio && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: Colors.tecnibus[100],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Bus size={24} color={Colors.tecnibus[600]} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#1F2937' }}>
                    En camino al colegio
                  </Text>
                  <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
                    Todos los estudiantes recogidos
                  </Text>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    La ruta finaliza automáticamente al llegar
                  </Text>
                </View>
                {etaFinRuta !== null && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '800',
                        color: Colors.tecnibus[600],
                      }}
                    >
                      ~{etaFinRuta} min
                    </Text>
                    <Text
                      style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '700' }}
                    >
                      AL COLEGIO
                    </Text>
                  </View>
                )}
              </View>
            )}

          {/* ── STATE: Pre-recorrido ── */}
          {!rutaCompletada &&
            !loadingRecorridos &&
            recorridos.length > 0 &&
            !routeActive && (
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 14,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: Colors.tecnibus[100],
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Bus size={22} color={Colors.tecnibus[600]} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        color: '#9CA3AF',
                        fontWeight: '700',
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                        marginBottom: 1,
                      }}
                    >
                      Tu ruta:
                    </Text>
                    <Text
                      style={{ fontSize: 15, fontWeight: '800', color: '#1F2937' }}
                      numberOfLines={1}
                    >
                      {recorridoActual?.nombre_ruta || 'Sin recorrido'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {recorridoActual
                        ? `${recorridoActual.hora_inicio} - ${recorridoActual.hora_fin}`
                        : ''}
                    </Text>
                    {recorridoActual && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 3,
                          backgroundColor: tipoRuta === 'ida' ? '#EEF2FF' : '#FFF7ED',
                          borderRadius: 20,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          alignSelf: 'flex-start',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: tipoRuta === 'ida' ? '#6366F1' : '#F97316',
                          }}
                        >
                          {tipoRuta === 'ida' ? 'IDA' : 'VUELTA'}
                        </Text>
                      </View>
                    )}
                  </View>
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.tecnibus[500]} />
                  ) : (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: 'rgba(209, 235, 247, 0.5)',
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: '800',
                          color: Colors.tecnibus[600],
                        }}
                      >
                        {estudiantes.length}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: Colors.tecnibus[500],
                        }}
                      >
                        {' '}
                        estudiantes
                      </Text>
                    </View>
                  )}
                </View>

                {recorridoActual && (
                  <TouchableOpacity
                    onPress={onIniciarRecorrido}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: Colors.tecnibus[600],
                      borderRadius: 16,
                      paddingVertical: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      shadowColor: Colors.tecnibus[600],
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.35,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <Play size={18} color="#ffffff" strokeWidth={2.5} fill="#ffffff" />
                    <Text
                      style={{
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: 16,
                        letterSpacing: 0.3,
                      }}
                    >
                      Iniciar Recorrido
                    </Text>
                  </TouchableOpacity>
                )}

                {recorridos.length > 1 && (
                  <TouchableOpacity
                    onPress={() => setShowRecorridoSelector(true)}
                    activeOpacity={0.7}
                    style={{ marginTop: 10, alignItems: 'center' }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: Colors.tecnibus[600],
                        fontWeight: '600',
                      }}
                    >
                      Cambiar recorrido
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
        </LinearGradient>
      </View>
    </TourStep>
  );
}

/**
 * Memoized: re-renders only when route state, student data, or ETA values
 * actually change — not on every GPS position update in the parent screen.
 */
export const DriverBottomCard = memo(DriverBottomCardComponent);
