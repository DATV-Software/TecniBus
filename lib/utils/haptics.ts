import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type HapticFeedback = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const haptic = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
  selection: async () => {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
    }
  }
};

async function triggerHaptic(type: HapticFeedback) {
  try {
    switch (type) {
      case 'light':
        // En iOS usar Medium en lugar de Light para más intensidad
        if (Platform.OS === 'ios') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        break;
      case 'medium':
        // En iOS usar Heavy en lugar de Medium
        if (Platform.OS === 'ios') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        break;
      case 'heavy':
        // Usar Heavy en ambas plataformas
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch (error) {
    // Silencioso: no bloquear UX si falla haptic
  }
}
