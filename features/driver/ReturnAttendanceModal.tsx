import { Colors } from "@/lib/constants/colors";
import type { EstudianteConAsistencia } from "@/lib/services/students/asistencias.service";
import { MapPin, Play, UserX, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ReturnAttendanceModalProps {
  visible: boolean;
  estudiantes: EstudianteConAsistencia[];
  loading?: boolean;
  nombreRuta: string;
  onConfirm: (ausentesIds: string[]) => Promise<void>;
  onCancel: () => void;
}

type Section = { title: string; data: EstudianteConAsistencia[] };

export function ReturnAttendanceModal({
  visible,
  estudiantes,
  loading = false,
  nombreRuta,
  onConfirm,
  onCancel,
}: ReturnAttendanceModalProps) {
  const [ausentesIds, setAusentesIds] = useState<Set<string>>(new Set());
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const listRef = useRef<SectionList<EstudianteConAsistencia, Section>>(null);

  // Pre-seleccionar estudiantes ya marcados ausentes (ej: por el padre antes del recorrido)
  useEffect(() => {
    if (!visible) return;
    const preAusentes = new Set(
      estudiantes.filter((e) => e.estado === 'ausente').map((e) => e.id),
    );
    setAusentesIds(preAusentes);
  }, [visible, estudiantes]);

  const toggleAusente = (id: string) => {
    setAusentesIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    setConfirmError(null);
    setConfirming(true);
    try {
      await onConfirm(Array.from(ausentesIds));
      setAusentesIds(new Set());
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : 'Error al confirmar asistencia');
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = () => {
    setAusentesIds(new Set());
    setConfirmError(null);
    onCancel();
  };

  // Agrupar estudiantes por primera letra del apellido (orden alfabético)
  const { sections, letters } = useMemo<{ sections: Section[]; letters: string[] }>(() => {
    const sorted = [...estudiantes].sort((a, b) =>
      `${a.apellido}${a.nombre}`.localeCompare(`${b.apellido}${b.nombre}`, "es"),
    );
    const map: Record<string, EstudianteConAsistencia[]> = {};
    for (const est of sorted) {
      const letter = est.apellido.charAt(0).toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(est);
    }
    const letters = Object.keys(map).sort();
    const sections: Section[] = letters.map((l) => ({ title: l, data: map[l] }));
    return { sections, letters };
  }, [estudiantes]);

  const scrollToLetter = (letter: string) => {
    const sectionIndex = letters.indexOf(letter);
    if (sectionIndex !== -1) {
      listRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 0,
      });
    }
  };

  const presentes = estudiantes.length - ausentesIds.size;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleCancel}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: "90%",
            flex: 1,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#1F2937" }}>
                Lista de pasajeros
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                <MapPin size={13} color={Colors.tecnibus[600]} strokeWidth={2.5} />
                <Text style={{ fontSize: 13, color: "#6B7280" }} numberOfLines={1}>
                  {nombreRuta} · Vuelta
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleCancel}
              style={{ backgroundColor: "#F3F4F6", padding: 8, borderRadius: 999 }}
            >
              <X size={20} color="#6B7280" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Instrucción */}
          <View
            style={{
              backgroundColor: Colors.tecnibus[50],
              marginHorizontal: 16,
              marginTop: 12,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: Colors.tecnibus[100],
            }}
          >
            <Text style={{ fontSize: 13, color: Colors.tecnibus[700], lineHeight: 18 }}>
              Toca el botón <Text style={{ fontWeight: "700" }}>AUSENTE</Text> en los estudiantes que{" "}
              <Text style={{ fontWeight: "700" }}>NO están en la buseta</Text>. Los demás se registran como presentes.
            </Text>
          </View>

          {/* Contadores */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              paddingHorizontal: 16,
              marginTop: 12,
              marginBottom: 4,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "#D1FAE5",
                borderRadius: 10,
                paddingVertical: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#065F46" }}>{presentes}</Text>
              <Text style={{ fontSize: 11, color: "#059669", fontWeight: "600" }}>PRESENTES</Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: ausentesIds.size > 0 ? "#FEE2E2" : "#F3F4F6",
                borderRadius: 10,
                paddingVertical: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: "800", color: ausentesIds.size > 0 ? "#991B1B" : "#9CA3AF" }}>
                {ausentesIds.size}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: ausentesIds.size > 0 ? "#EF4444" : "#9CA3AF" }}>
                AUSENTES
              </Text>
            </View>
          </View>

          {/* Lista + Índice alfabético */}
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
              <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Cargando estudiantes...</Text>
            </View>
          ) : estudiantes.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Text style={{ fontSize: 32 }}>👥</Text>
              <Text style={{ color: "#6B7280", fontSize: 14 }}>No hay estudiantes en esta ruta</Text>
            </View>
          ) : (
            <View style={{ flex: 1, flexDirection: "row" }}>
              {/* SectionList */}
              <SectionList
                ref={listRef}
                sections={sections}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, paddingRight: 36 }}
                stickySectionHeadersEnabled
                onScrollToIndexFailed={() => {}}
                renderSectionHeader={({ section: { title } }) => (
                  <View
                    style={{
                      backgroundColor: "#F9FAFB",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      marginBottom: 4,
                      marginTop: 6,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.tecnibus[600] }}>
                      {title}
                    </Text>
                  </View>
                )}
                renderItem={({ item }) => {
                  const isAusente = ausentesIds.has(item.id);
                  const faltaJustificada = item.estado === 'ausente' && item.notas?.includes('padre');
                  return (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        marginBottom: 5,
                        borderRadius: 14,
                        borderWidth: 1.5,
                        borderColor: isAusente ? "#FCA5A5" : "#E5E7EB",
                        backgroundColor: isAusente ? "#FEF2F2" : "#FAFAFA",
                        gap: 10,
                      }}
                    >
                      {/* Avatar */}
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: isAusente ? "#FEE2E2" : Colors.tecnibus[100],
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: isAusente ? "#DC2626" : Colors.tecnibus[700],
                          }}
                        >
                          {item.nombre.charAt(0)}{item.apellido.charAt(0)}
                        </Text>
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: isAusente ? "#DC2626" : "#1F2937",
                          }}
                        >
                          {item.apellido}, {item.nombre}
                        </Text>
                        {faltaJustificada ? (
                          <View
                            style={{
                              backgroundColor: "#FEF3C7",
                              borderRadius: 6,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              alignSelf: "flex-start",
                              marginTop: 2,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: "700", color: "#92400E" }}>
                              FALTA JUSTIFICADA
                            </Text>
                          </View>
                        ) : item.parada?.nombre ? (
                          <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                            {item.parada.nombre}
                          </Text>
                        ) : null}
                      </View>

                      {/* Botón ausente/presente — bloqueado si es falta justificada */}
                      <TouchableOpacity
                        onPress={faltaJustificada ? undefined : () => toggleAusente(item.id)}
                        activeOpacity={faltaJustificada ? 1 : 0.7}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 20,
                          backgroundColor: faltaJustificada ? "#FEF3C7" : isAusente ? "#FEE2E2" : "#F3F4F6",
                          borderWidth: 1,
                          borderColor: faltaJustificada ? "#FCD34D" : isAusente ? "#FCA5A5" : "#E5E7EB",
                          opacity: faltaJustificada ? 0.7 : 1,
                        }}
                      >
                        <UserX size={12} color={faltaJustificada ? "#92400E" : isAusente ? "#DC2626" : "#9CA3AF"} strokeWidth={2.5} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: faltaJustificada ? "#92400E" : isAusente ? "#DC2626" : "#9CA3AF",
                          }}
                        >
                          {faltaJustificada ? "JUSTIFICADA" : isAusente ? "AUSENTE" : "PRESENTE"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />

              {/* Índice alfabético lateral */}
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 28,
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                {letters.map((letter) => (
                  <TouchableOpacity
                    key={letter}
                    onPress={() => scrollToLetter(letter)}
                    style={{
                      width: 22,
                      height: 22,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 11,
                    }}
                    activeOpacity={0.6}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: Colors.tecnibus[600] }}>
                      {letter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Footer */}
          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: "#F3F4F6",
              gap: 10,
            }}
          >
            {confirmError ? (
              <View style={{ backgroundColor: "#FEE2E2", borderRadius: 10, padding: 10 }}>
                <Text style={{ color: "#DC2626", fontSize: 13, textAlign: "center" }}>
                  {confirmError}
                </Text>
              </View>
            ) : null}
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={loading || confirming}
              activeOpacity={0.85}
              style={{
                backgroundColor: loading || confirming ? "#9CA3AF" : Colors.tecnibus[600],
                borderRadius: 16,
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                shadowColor: Colors.tecnibus[600],
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Play size={18} color="#fff" strokeWidth={2.5} fill="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {confirming ? "Confirmando..." : confirmError ? "Reintentar" : `Confirmar e Iniciar (${presentes} estudiantes)`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.7}
              style={{ alignItems: "center", paddingVertical: 8 }}
            >
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
