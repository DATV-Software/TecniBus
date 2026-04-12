import { View, Text } from 'react-native';
import { CheckCircle2, XCircle } from 'lucide-react-native';

type StatusBadgeProps = {
  status: 'attending' | 'absent' | 'active' | 'inactive' | 'success' | 'warning' | 'pending';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  customLabel?: string;
};

export default function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  customLabel,
}: StatusBadgeProps) {
  
  // Configuración según el estado
  const statusConfig = {
    attending: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      iconColor: '#16a34a',
      icon: CheckCircle2,
      label: 'Asiste',
    },
    absent: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      iconColor: '#dc2626',
      icon: XCircle,
      label: 'Ausente',
    },
    active: {
      bgColor: 'bg-green-500',
      textColor: 'text-white',
      iconColor: '#ffffff',
      icon: CheckCircle2,
      label: 'EN RUTA',
    },
    inactive: {
      bgColor: 'bg-gray-400',
      textColor: 'text-white',
      iconColor: '#ffffff',
      icon: XCircle,
      label: 'INACTIVO',
    },
    success: {
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      iconColor: '#2563eb',
      icon: CheckCircle2,
      label: 'Completado',
    },
    warning: {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      iconColor: '#ca8a04',
      icon: CheckCircle2,
      label: 'Pendiente',
    },
    pending: {
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      iconColor: '#6b7280',
      icon: CheckCircle2,
      label: 'Pendiente',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  // Tamaños
  const sizeStyles = {
    sm: 'px-2 py-1',
    md: 'px-3 py-1',
    lg: 'px-4 py-2',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  return (
    <View className={`${config.bgColor} ${sizeStyles[size]} rounded-full flex-row items-center`}>
      {showIcon && (
        <Icon size={iconSizes[size]} color={config.iconColor} strokeWidth={2.5} />
      )}
      <Text className={`${config.textColor} font-bold ${textSizes[size]} ${showIcon ? 'ml-1' : ''}`}>
        {customLabel || config.label}
      </Text>
    </View>
  );
}