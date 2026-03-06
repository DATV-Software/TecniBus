import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Retorna la altura actual del teclado en píxeles.
 * Funciona dentro de Modal, bottom sheets, y cualquier componente.
 * Es la alternativa confiable a KeyboardAvoidingView cuando este no funciona
 * (ej: Modal + Android edgeToEdge).
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // "keyboardWillShow" en iOS da animación suave; "keyboardDidShow" en Android
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
