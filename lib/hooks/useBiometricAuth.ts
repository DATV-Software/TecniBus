import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { haptic } from "@/lib/utils/haptics";

type BiometricAuthResult = {
  isBiometricSupported: boolean;
  hasSavedCredentials: boolean;
  handleBiometricAuth: (
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>,
    onSuccess: (email: string, password: string) => void,
    onError: (message: string) => void,
  ) => Promise<void>;
  saveCredentials: (email: string, password: string) => Promise<void>;
  clearCredentials: (
    signOut: () => Promise<void>,
  ) => Promise<void>;
};

export function useBiometricAuth(): BiometricAuthResult {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(compatible && enrolled);

      const savedEmail = await SecureStore.getItemAsync("userEmail");
      setHasSavedCredentials(!!savedEmail);
    } catch (_error) {
      setIsBiometricSupported(false);
    }
  };

  const handleBiometricAuth = useCallback(async (
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>,
    onSuccess: (email: string, password: string) => void,
    onError: (message: string) => void,
  ) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentícate para iniciar sesión",
        fallbackLabel: "Usar contraseña",
        cancelLabel: "Cancelar",
      });

      if (result.success) {
        haptic.success();

        const savedEmail = await SecureStore.getItemAsync("userEmail");
        const savedPassword = await SecureStore.getItemAsync("userPassword");

        if (savedEmail && savedPassword) {
          const { error } = await signIn(savedEmail, savedPassword);

          if (error) {
            onError(error.message);
            haptic.error();
          } else {
            onSuccess(savedEmail, savedPassword);
            haptic.success();
          }
        } else {
          onError("No hay credenciales guardadas");
        }
      } else {
        haptic.warning();
      }
    } catch (_error) {
      onError("Error en autenticación biométrica");
      haptic.error();
    }
  }, []);

  const saveCredentials = useCallback(async (email: string, password: string) => {
    if (!isBiometricSupported) return;
    try {
      await SecureStore.setItemAsync("userEmail", email.trim().toLowerCase());
      await SecureStore.setItemAsync("userPassword", password);
      setHasSavedCredentials(true);
    } catch (_error) {
      // Silent fail — credential saving is best-effort
    }
  }, [isBiometricSupported]);

  const clearCredentials = useCallback(async (
    signOut: () => Promise<void>,
  ) => {
    try {
      await signOut();
      await SecureStore.deleteItemAsync("userEmail");
      await SecureStore.deleteItemAsync("userPassword");
      setHasSavedCredentials(false);
    } catch (_error) {
      throw _error;
    }
  }, []);

  return {
    isBiometricSupported,
    hasSavedCredentials,
    handleBiometricAuth,
    saveCredentials,
    clearCredentials,
  };
}
