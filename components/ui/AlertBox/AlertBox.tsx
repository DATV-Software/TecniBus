import { AlertOptions, AlertType } from "./AlertContext";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

const TYPE_COLORS: Record<AlertType, { accent: string; bg: string }> = {
  info:    { accent: "#3B82F6", bg: "#EFF6FF" },
  success: { accent: "#10B981", bg: "#ECFDF5" },
  warning: { accent: "#F59E0B", bg: "#FFFBEB" },
  error:   { accent: "#EF4444", bg: "#FEF2F2" },
};

type Props = {
  visible: boolean;
  options: AlertOptions;
  onDismiss: () => void;
};

export function AlertBox({ visible, options, onDismiss }: Props) {
  const { title, message, type = "info", buttons } = options;
  const { accent, bg } = TYPE_COLORS[type];

  const resolvedButtons =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: "OK", style: "default" as const }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
        onPress={onDismiss}
      >
        <Pressable
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            width: "100%",
            maxWidth: 360,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 12,
          }}
          onPress={() => {}} // prevent backdrop dismiss when tapping card
        >
          {/* Accent top bar */}
          <View style={{ height: 4, backgroundColor: accent }} />

          {/* Content */}
          <View style={{ padding: 24, gap: 8 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#111827",
                lineHeight: 24,
              }}
            >
              {title}
            </Text>
            {message ? (
              <Text
                style={{
                  fontSize: 14,
                  color: "#4B5563",
                  lineHeight: 20,
                }}
              >
                {message}
              </Text>
            ) : null}
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />

          {/* Buttons */}
          <View
            style={{
              flexDirection: resolvedButtons.length > 2 ? "column" : "row",
            }}
          >
            {resolvedButtons.map((btn, idx) => {
              const isDestructive = btn.style === "destructive";
              const isCancel = btn.style === "cancel";
              const isLast = idx === resolvedButtons.length - 1;

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    onDismiss();
                    btn.onPress?.();
                  }}
                  style={{
                    flex: resolvedButtons.length <= 2 ? 1 : undefined,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRightWidth:
                      resolvedButtons.length === 2 && !isLast ? 1 : 0,
                    borderRightColor: "#F3F4F6",
                    borderBottomWidth:
                      resolvedButtons.length > 2 && !isLast ? 1 : 0,
                    borderBottomColor: "#F3F4F6",
                    backgroundColor: isDestructive ? "#FEF2F2" : "#FFFFFF",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: isCancel ? "400" : "600",
                      color: isDestructive
                        ? "#EF4444"
                        : isCancel
                        ? "#6B7280"
                        : accent,
                    }}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
