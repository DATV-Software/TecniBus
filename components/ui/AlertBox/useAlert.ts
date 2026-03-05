import { useContext } from "react";
import { AlertContext, AlertContextType } from "./AlertContext";

export function useAlert(): AlertContextType {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used inside <AlertProvider>");
  return ctx;
}
