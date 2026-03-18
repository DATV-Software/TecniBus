/**
 * Full-screen states for the parent screen:
 * - ParentLoadingState: spinner while fetching students
 * - ParentEmptyState: no students assigned to account
 */
import { Colors } from '@/lib/constants/colors';
import { GraduationCap, LogOut } from 'lucide-react-native';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

export function ParentLoadingState() {
  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: Colors.tecnibus[50] }}
    >
      <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
      <Text className="text-gray-500 mt-4">Cargando información...</Text>
    </View>
  );
}

type EmptyStateProps = { onSignOut: () => void };

export function ParentEmptyState({ onSignOut }: EmptyStateProps) {
  return (
    <View
      className="flex-1 items-center justify-center px-6"
      style={{ backgroundColor: Colors.tecnibus[50] }}
    >
      <View className="bg-gray-100 p-4 rounded-full mb-4">
        <GraduationCap size={48} color="#9ca3af" strokeWidth={2} />
      </View>
      <Text className="text-gray-800 text-xl font-bold mb-2 font-calsans">
        Sin estudiantes asignados
      </Text>
      <Text className="text-gray-500 text-center">
        Aún no tienes estudiantes vinculados a tu cuenta. Contacta al administrador para asignar
        estudiantes.
      </Text>
      <TouchableOpacity
        onPress={onSignOut}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 24,
          backgroundColor: '#FEF2F2',
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#FCA5A5',
        }}
      >
        <LogOut size={18} color="#DC2626" strokeWidth={2} />
        <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 15 }}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
