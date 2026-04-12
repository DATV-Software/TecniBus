import { useEffect } from 'react';
import { View, Text, StatusBar } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Bus } from 'lucide-react-native';

export default function SplashScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    if (pathname === '/') {
      // Animación suave del logo
      scale.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });

      // Fade in suave del texto con delay
      setTimeout(() => {
        textOpacity.value = withTiming(1, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        });
      }, 300);

      // Navegar al login después de 2 segundos
      const timeout = setTimeout(() => {
        router.push('/login');
      }, 2000);

      return () => clearTimeout(timeout);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View className="flex-1 bg-primary-600 items-center justify-center">
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      
      {/* Logo animado */}
      <Animated.View 
        style={logoStyle}
        className="bg-white rounded-full p-8 mb-6 shadow-2xl"
      >
        <Bus size={80} color="#2563eb" strokeWidth={2.5} />
      </Animated.View>

      {/* Texto animado */}
      <Animated.View style={textStyle}>
        <Text className="text-white text-5xl font-bold mb-2">
          TecniBus
        </Text>
        <Text className="text-primary-200 text-lg text-center">
          Monitoreo de Transporte Escolar
        </Text>
      </Animated.View>

      {/* Versión */}
      <Animated.View style={textStyle} className="absolute bottom-12">
        <Text className="text-primary-300 text-sm">
          Versión Alpha 1.0
        </Text>
      </Animated.View>
    </View>
  );
}
