import { Colors } from "@/lib/constants/colors";
import { LucideIcon } from "lucide-react-native";
import { ReactNode, useState } from "react";
import {
  KeyboardTypeOptions,
  Text,
  TextInput,
  View,
} from "react-native";

interface FormFieldProps {
  label: string;
  icon?: LucideIcon;
  required?: boolean;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  editable?: boolean;
  maxLength?: number;
  rightIcon?: ReactNode;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export function FormField({
  label,
  icon: Icon,
  required,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  editable = true,
  maxLength,
  rightIcon,
  autoCapitalize,
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: "#374151",
          marginBottom: 6,
        }}
      >
        {label}
        {required && (
          <Text style={{ color: Colors.tecnibus[600] }}> *</Text>
        )}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: editable ? "#F9FAFB" : "#F3F4F6",
          borderRadius: 12,
          paddingHorizontal: 14,
          borderWidth: 1.5,
          borderColor: focused ? Colors.tecnibus[300] : "#E5E7EB",
        }}
      >
        {Icon && (
          <Icon
            size={18}
            color={focused ? Colors.tecnibus[600] : "#9CA3AF"}
            strokeWidth={2}
          />
        )}
        <TextInput
          style={{
            flex: 1,
            paddingVertical: 14,
            paddingHorizontal: Icon ? 10 : 0,
            fontSize: 15,
            color: editable ? "#1F2937" : "#6B7280",
          }}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={editable}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightIcon}
      </View>
    </View>
  );
}
