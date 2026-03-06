import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { View, ViewStyle } from "react-native";
import { type ReactNode } from "react";

interface KeyboardSafeViewProps {
  children: ReactNode;
  scrollEnabled?: boolean;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  extraScrollHeight?: number;
}

export function KeyboardSafeView({
  children,
  scrollEnabled = true,
  contentContainerStyle,
  style,
  extraScrollHeight = 20,
}: KeyboardSafeViewProps) {
  if (scrollEnabled) {
    return (
      <KeyboardAwareScrollView
        style={[{ flex: 1 }, style]}
        contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={extraScrollHeight}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </KeyboardAwareScrollView>
    );
  }

  return (
    <View style={[{ flex: 1 }, style]}>
      {children}
    </View>
  );
}
