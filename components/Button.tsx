import { TouchableOpacity, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useShadow } from '@/lib/utils/shadows';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  fullWidth?: boolean;
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  fullWidth = true,
}: ButtonProps) {
  const shadow = useShadow('md');

  // Estilos según variante
  const variantStyles = {
    primary: 'bg-primary-600',
    secondary: 'bg-gray-600',
    success: 'bg-green-600',
    danger: 'bg-red-600',
    warning: 'bg-accent-500',
  };

  const disabledStyle = 'bg-gray-300';

  // Estilos según tamaño
  const sizeStyles = {
    sm: 'py-2 px-4',
    md: 'py-3 px-6',
    lg: 'py-4 px-8',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const iconSizes = {
    sm: 18,
    md: 20,
    lg: 24,
  };

  return (
    <TouchableOpacity
      className={`rounded-xl flex-row items-center justify-center ${
        disabled ? disabledStyle : variantStyles[variant]
      } ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''}`}
      style={shadow}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {Icon && iconPosition === 'left' && (
        <Icon 
          size={iconSizes[size]} 
          color="#ffffff" 
          strokeWidth={2.5}
          fill={variant === 'success' || variant === 'danger' ? '#ffffff' : 'none'}
        />
      )}
      
      <Text className={`text-white font-bold ${textSizeStyles[size]} ${
        Icon ? (iconPosition === 'left' ? 'ml-2' : 'mr-2') : ''
      }`}>
        {title}
      </Text>

      {Icon && iconPosition === 'right' && (
        <Icon 
          size={iconSizes[size]} 
          color="#ffffff" 
          strokeWidth={2.5}
          fill={variant === 'success' || variant === 'danger' ? '#ffffff' : 'none'}
        />
      )}
    </TouchableOpacity>
  );
}