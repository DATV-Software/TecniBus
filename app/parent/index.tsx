import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import RouteMap from "@/components/RouteMap";
import { useAuth } from "@/contexts/AuthContext";
import { useParentAsistencia } from "@/lib/hooks/useParentAsistencia";
import { useParentEstudiantes } from "@/lib/hooks/useParentEstudiantes";
import { useParentRecorrido } from "@/lib/hooks/useParentRecorrido";
import {
  DraggableBottomSheet,
  ParentAbsenceCard,
  ParentEmptyState,
  ParentLoadingState,
  ParentStatusBadges,
  ParentTrackingHero,
  StudentSelector,
  TodayTimeline,
  useParentActions,
  useParentDerivedState,
  useParentTourSetup,
} from "@/features/parent";
import { Colors } from "@/lib/constants/colors";
import { Heart } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StatusBar, View } from "react-native";
import { TourStep, useTourAutoStart } from "@/features/tour";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ParentHomeScreen() {
  const { profile, signOut } = useAuth();
  const { sheetRef, sheetScrollRef, expandSheet, expandAndScrollTimeline } =
    useParentTourSetup();
  const insets = useSafeAreaInsets();

  useTourAutoStart("parent");

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const {
    estudiantes,
    estudianteSeleccionado,
    setEstudianteSeleccionado,
    loading,
    loadEstudiantes,
  } = useParentEstudiantes();

  const {
    isAttending,
    setIsAttending,
    estudianteRecogido,
    marcadoPorChofer,
    horaRecogida,
  } = useParentAsistencia(estudianteSeleccionado?.id);

  const {
    choferEnCamino,
    idAsignacion,
    horaInicioRecorrido,
    polylineCoordinates,
    estimatedMinutes,
    etaColegio,
    horaLlegadaColegio,
    nombreChofer,
    idChofer,
    ubicacionBus,
    tipoRuta,
  } = useParentRecorrido(estudianteSeleccionado, isAttending);

  // ── Local state ────────────────────────────────────────────────────────────
  const [processingAttendance, setProcessingAttendance] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);

  // ── Derived state ──────────────────────────────────────────────────────────
  const { ubicacionColegio, paradasRuta, polylineRestante, timelineEvents } =
    useParentDerivedState({
      tipoRuta,
      choferEnCamino,
      horaInicioRecorrido,
      estudianteSeleccionado,
      estimatedMinutes,
      etaColegio,
      estudianteRecogido,
      horaRecogida,
      horaLlegadaColegio,
      polylineCoordinates,
      ubicacionBus,
    });

  // ── Actions ────────────────────────────────────────────────────────────────
  const {
    handleToggleAttendance,
    handleSheetSnapChange,
    handleSettings,
    handleSelectStudent,
    handleChatDriver,
  } = useParentActions({
    estudianteSeleccionado,
    isAttending,
    tipoRuta,
    choferEnCamino,
    marcadoPorChofer,
    idAsignacion,
    idChofer,
    nombreChofer,
    setIsAttending,
    setEstudianteSeleccionado,
    setShowStudentSelector,
    setIsSheetExpanded,
    setProcessingAttendance,
  });

  // ── Guard states ───────────────────────────────────────────────────────────
  if (loading) return <ParentLoadingState />;
  if (estudiantes.length === 0) return <ParentEmptyState onSignOut={signOut} />;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar backgroundColor={Colors.tecnibus[600]} barStyle="light-content" />

      {/* ── LAYER 0: Map fullscreen background ── */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        <RouteMap
          paradas={paradasRuta}
          ubicacionBus={estudianteRecogido ? null : ubicacionBus}
          recorridoActivo={choferEnCamino && !estudianteRecogido}
          ubicacionColegio={ubicacionColegio}
          showsUserLocation={false}
          polylineCoordinates={estudianteRecogido ? [] : polylineRestante}
        />
      </View>

      {/* ── LAYER 1: Header + badges overlay ── */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}>
        {/* TourStep 1: Header */}
        <TourStep
          scope="parent"
          id="parent-header"
          order={1}
          title="Estado del Recorrido"
          description="Aquí ves el estado en tiempo real: si la buseta está en camino, el tiempo estimado de llegada a tu parada y si tu hijo está marcado como asistente o ausente hoy."
          borderRadius={24}
          padding={0}
        >
          <DashboardHeader
            title="PANEL DE PADRE"
            subtitle={`¡Hola ${profile?.nombre}!`}
            gradientColors={[
              Colors.tecnibus[600],
              Colors.tecnibus[500],
              Colors.tecnibus[400],
            ]}
            icon={Heart}
          />
        </TourStep>

        <ParentStatusBadges
          tipoRuta={tipoRuta}
          estudianteRecogido={estudianteRecogido}
          isAttending={isAttending}
          marcadoPorChofer={marcadoPorChofer}
          choferEnCamino={choferEnCamino}
          estimatedMinutes={estimatedMinutes}
          etaColegio={etaColegio}
          horaRecogida={horaRecogida}
          estudiantes={estudiantes}
          estudianteSeleccionado={estudianteSeleccionado}
          onOpenStudentSelector={() => setShowStudentSelector(true)}
        />
      </View>

      {/* ── LAYER 2: Draggable bottom sheet ── */}
      <DraggableBottomSheet
        ref={sheetRef}
        initialSnapPoint={0.15}
        minSnapPoint={0.15}
        maxSnapPoint={0.52}
        onSnapPointChange={handleSheetSnapChange}
      >
        <ScrollView
          ref={sheetScrollRef}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          scrollEnabled={isSheetExpanded}
          nestedScrollEnabled={true}
          bounces={isSheetExpanded}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 430 }}
        >
          {/* Hero card — TourStep 2 */}
          <TourStep
            scope="parent"
            id="parent-hero"
            order={2}
            title="Info del Chofer y Acciones"
            description="Aquí ves el nombre del chofer, si está activo, y los botones para chatear directamente con él o reportar la falta de tu hijo antes de que inicie el recorrido."
            beforeShow={expandSheet}
            borderRadius={20}
            padding={4}
          >
            <ParentTrackingHero
              studentName={estudianteSeleccionado?.nombreCompleto || "Estudiante"}
              driverName={nombreChofer || "—"}
              isOnline={choferEnCamino}
              isAttending={isAttending}
              isRecogido={estudianteRecogido}
              routeStarted={choferEnCamino}
              onChatPress={handleChatDriver}
              onNotifyAbsencePress={handleToggleAttendance}
            />
          </TourStep>

          {/* Timeline or absence card — TourStep 3 always registered */}
          <TourStep
            scope="parent"
            id="parent-timeline"
            order={3}
            title="Timeline del Recorrido"
            description="Este timeline muestra cada etapa del recorrido en tiempo real: inicio, tu parada y llegada al colegio. Los tiempos estimados (ETA) se actualizan conforme avanza la buseta."
            beforeShow={expandAndScrollTimeline}
            borderRadius={20}
            padding={4}
          >
            {isAttending || estudianteRecogido ? (
              <TodayTimeline events={timelineEvents} isLive={choferEnCamino} />
            ) : (
              <ParentAbsenceCard
                tipoRuta={tipoRuta}
                nombreEstudiante={estudianteSeleccionado?.nombre}
                marcadoPorChofer={marcadoPorChofer}
              />
            )}
          </TourStep>
        </ScrollView>
      </DraggableBottomSheet>

      {/* ── Modals ── */}
      <StudentSelector
        visible={showStudentSelector}
        estudiantes={estudiantes}
        selectedId={estudianteSeleccionado?.id}
        onSelect={handleSelectStudent}
        onClose={() => setShowStudentSelector(false)}
      />

      {/* ── Bottom navigation ── */}
      <BottomNavigation
        activeTab="home"
        activeColor={Colors.tecnibus[600]}
        onHomePress={() => {}}
        onMiddlePress={handleChatDriver}
        onSettingsPress={handleSettings}
      />

      {/* ── TOUR ANCHOR: Bottom Navigation (step 4) ── */}
      <TourStep
        scope="parent"
        id="parent-nav"
        order={4}
        title="Chat y Ajustes"
        description="El botón central abre el chat directo con el chofer durante el recorrido. El ícono de ajustes te lleva a la configuración de tu perfil y notificaciones."
        style={{
          position: "absolute",
          bottom: 7 + Math.max(insets.bottom, 8),
          left: 30,
          right: 30,
          height: 74,
        }}
        borderRadius={28}
        padding={0}
        pointerEvents="none"
      >
        <View style={{ flex: 1 }} collapsable={false} />
      </TourStep>
    </View>
  );
}
