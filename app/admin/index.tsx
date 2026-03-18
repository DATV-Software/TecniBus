import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants/colors";
import {
  DashboardStats,
  getDashboardStats,
} from "@/lib/services/stats.service";
import { haptic } from "@/lib/utils/haptics";
import { QUERY_KEYS } from "@/lib/constants/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";

import {
  BottomNavigation,
  DashboardHeader,
  DecorationBottom,
  DecorationMid,
  DecorationTop,
  Section,
} from "@/components/layout";
import { StatusPanel } from "@/components/ui";
import { AdminQuickActions, AdminStatsGrid, useAdminTourSetup } from "@/features/admin";
import { TourStep, useTourAutoStart } from "@/features/tour";

export default function AdminHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { scrollRef, scrollToStatus, scrollToActions } = useAdminTourSetup();

  useTourAutoStart('admin');

  const DEFAULT_STATS: DashboardStats = {
    totalStudents: 0,
    totalDrivers: 0,
    totalParents: 0,
    totalRoutes: 0,
    activeBuses: 0,
    totalBuses: 0,
  };

  const { data: stats = DEFAULT_STATS, isLoading: loading, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.dashboardStats,
    queryFn: getDashboardStats,
  });

  const handleRefresh = () => {
    if (isRefetching) return;
    haptic.light();
    refetch();
  };

  const handleSettings = () => {
    haptic.light();
    router.push("/admin/settings");
  };

  const handleTrackingPress = () => {
    haptic.light();
    router.push("/admin/liveview");
  };

  const handleStudentsPress = () => {
    haptic.light();
    router.push("/admin/estudiantes");
  };

  const handleDriversPress = () => {
    haptic.light();
    router.push("/admin/choferes");
  };

  const handleParentsPress = () => {
    haptic.light();
    router.push("/admin/padres");
  };

  const handleBusesPress = () => {
    haptic.light();
    router.push("/admin/busetas");
  };

  const handleRoutesPress = () => {
    haptic.light();
    router.push("/admin/rutas");
  };

  const handleAnnouncementsPress = () => {
    haptic.light();
    router.push("/admin/anuncios");
  };

  const handleAssignmentsPress = () => {
    haptic.light();
    router.push("/admin/asignaciones");
  };

  const handleReportesPress = () => {
    haptic.light();
    router.push("/admin/reportes");
  };

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.tecnibus[50] }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.tecnibus[600]}
      />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[Colors.tecnibus[600]]}
            tintColor={Colors.tecnibus[600]}
            progressViewOffset={40}
          />
        }
      >
        <DashboardHeader
          title="Panel de Administración"
          subtitle={`¡Hola ${profile?.nombre || "Diego"}!`}
        />

        {loading ? (
          <View style={{ paddingVertical: 80, alignItems: "center" }}>
            <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
            <Text
              className="font-calsans"
              style={{ color: Colors.tecnibus[700], marginTop: 16 }}
            >
              Cargando dashboard...
            </Text>
          </View>
        ) : (
          <>
            {/* Stats 2x2 — TourStep wraps the grid directly */}
            <TourStep
              scope="admin"
              id="admin-stats"
              order={1}
              title="Estadísticas en tiempo real"
              description="Consulta el total de estudiantes, choferes, padres y busetas del sistema. Toca cualquier tarjeta para ver el listado completo."
              borderRadius={16}
              padding={4}
            >
              <AdminStatsGrid
                stats={stats}
                onStudentsPress={handleStudentsPress}
                onDriversPress={handleDriversPress}
                onParentsPress={handleParentsPress}
                onBusesPress={handleBusesPress}
              />
            </TourStep>

            <DecorationTop />

            {/* Estado Activo — TourStep wraps StatusPanel directly */}
            <View style={{ paddingHorizontal: 20, marginTop: 20, marginBottom: 24 }}>
              <TourStep
                scope="admin"
                id="admin-status"
                order={2}
                title="Monitoreo de Flotas"
                description="Aquí ves cuántas busetas están en ruta ahora mismo. Toca 'En vivo' para abrir el mapa con todas las busetas en tiempo real."
                borderRadius={16}
                padding={4}
                beforeShow={scrollToStatus}
              >
                <StatusPanel
                  activeCount={stats.activeBuses}
                  totalCount={stats.totalBuses}
                  label="En ruta actualmente"
                  onLiveViewPress={handleTrackingPress}
                />
              </TourStep>
            </View>

            <DecorationMid />

            {/* Acciones Rápidas — TourStep wraps actions directly (inside Section) */}
            <Section title="Acciones Rápidas">
              <TourStep
                scope="admin"
                id="admin-actions"
                order={3}
                title="Acciones Rápidas"
                description="Desde aquí gestionas rutas, vinculas choferes a busetas, publicas anuncios para los padres y accedes a reportes del sistema."
                borderRadius={16}
                padding={4}
                beforeShow={scrollToActions}
              >
                <AdminQuickActions
                  onRoutesPress={handleRoutesPress}
                  onAnnouncementsPress={handleAnnouncementsPress}
                  onAssignmentsPress={handleAssignmentsPress}
                  onReportesPress={handleReportesPress}
                />
              </TourStep>
            </Section>

            {/* Decoraciones al final */}
            <DecorationBottom />

            {/* Spacer para que el contenido no quede detrás del bottom nav flotante */}
            <View style={{ height: 90 }} />
          </>
        )}
      </ScrollView>

      {/* Barra de navegación inferior flotante */}
      <BottomNavigation
        activeTab="home"
        middleTab="tracking"
        onHomePress={() => {}}
        onMiddlePress={handleTrackingPress}
        onSettingsPress={handleSettings}
      />
    </View>
  );
}
