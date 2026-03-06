import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Calcula el keyboardVerticalOffset correcto según plataforma y contexto.
 *
 * En iOS, KeyboardAvoidingView con behavior="padding" necesita conocer
 * la altura del área por encima del componente (status bar + header si hay).
 * En Android con behavior="height", generalmente 0 es correcto.
 *
 * @param hasFixedHeader - true si la pantalla tiene un header fijo sobre el KAV
 *                         (para pantallas donde el header está FUERA del KAV)
 */
export function useKeyboardOffset(hasFixedHeader = false): number {
  const insets = useSafeAreaInsets();

  if (Platform.OS !== "ios") return 0;

  if (hasFixedHeader) {
    // header fijo (SubScreenHeader ~120-140px según nuevo diseño) + status bar
    return insets.top + 120;
  }

  return 0;
}
