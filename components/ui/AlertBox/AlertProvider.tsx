import { useState } from "react";
import { AlertBox } from "./AlertBox";
import { AlertContext, AlertOptions } from "./AlertContext";

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions>({ title: "" });

  const showAlert = (opts: AlertOptions) => {
    setOptions(opts);
    setVisible(true);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AlertBox
        visible={visible}
        options={options}
        onDismiss={() => setVisible(false)}
      />
    </AlertContext.Provider>
  );
}
