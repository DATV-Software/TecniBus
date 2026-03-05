import { createContext } from "react";

export type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

export type AlertType = "info" | "success" | "warning" | "error";

export type AlertOptions = {
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
};

export type AlertContextType = {
  showAlert: (options: AlertOptions) => void;
};

export const AlertContext = createContext<AlertContextType | null>(null);
