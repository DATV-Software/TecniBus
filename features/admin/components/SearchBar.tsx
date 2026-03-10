import { Search, X } from "lucide-react-native";
import { TextInput, TouchableOpacity, View } from "react-native";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Buscar...",
  autoCapitalize = "none",
}: SearchBarProps) {
  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <Search size={18} color="#9CA3AF" strokeWidth={2} />
      <TextInput
        style={{
          flex: 1,
          marginLeft: 10,
          fontSize: 15,
          color: "#1F2937",
        }}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText("")}>
          <X size={18} color="#9CA3AF" strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  );
}
