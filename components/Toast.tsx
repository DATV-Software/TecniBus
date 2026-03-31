import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react-native';
import { useToastSpacing } from '@/lib/utils/spacing';
import { useShadow } from '@/lib/utils/shadows';

type ToastProps = {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onHide: () => void;
  duration?: number;
};

export default function Toast({
  visible,
  message,
  type = 'success',
  onHide,
  duration = 1500,
}: ToastProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const toastSpacing = useToastSpacing();
  const shadow = useShadow('lg');

  useEffect(() => {
    if (visible) {
      // Mostrar toast con animación suave
      translateY.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });

      // Auto-ocultar después del duration
      const timeout = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const hideToast = () => {
    translateY.value = withTiming(-100, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    });
    opacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    }, () => {
      runOnJS(onHide)();
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const config = {
    success: { bg: '#22c55e', icon: CheckCircle2, iconColor: '#ffffff' },
    error:   { bg: '#ef4444', icon: XCircle,      iconColor: '#ffffff' },
    info:    { bg: '#3DA7D7', icon: Info,          iconColor: '#ffffff' },
    warning: { bg: '#f59e0b', icon: AlertTriangle, iconColor: '#ffffff' },
  };

  const { bg, icon: Icon, iconColor } = config[type];

  if (!visible) return null;

  return (
    <Animated.View
      style={[animatedStyle, toastSpacing]}
      className="absolute top-0 left-0 right-0 z-50 px-6"
    >
      <View className="rounded-2xl p-4 flex-row items-center" style={[{ backgroundColor: bg }, shadow]}>
        <Icon size={24} color={iconColor} strokeWidth={2.5} />
        <Text className="text-white font-semibold text-base ml-3 flex-1">
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}