import { Colors } from "@/lib/constants/colors";
import {
  PlaceSuggestion,
  getPlaceDetails,
  searchPlaceSuggestions,
} from "@/lib/services/places.service";
import { MapPin, Search, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface AddressSearchInputProps {
  onSelect: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  label?: string;
}

const DEBOUNCE_MS = 400;

export function AddressSearchInput({
  onSelect,
  placeholder = "Buscar dirección...",
  label,
}: AddressSearchInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchPlaceSuggestions(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = async (suggestion: PlaceSuggestion) => {
    setQuery(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    setLoading(true);

    const details = await getPlaceDetails(suggestion.placeId);
    setLoading(false);

    if (details) {
      onSelect(details.address, details.lat, details.lng);
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <View style={{ marginBottom: 0 }}>
      {!!label && (
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: "#374151",
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      )}

      {/* Input */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: Colors.tecnibus[50],
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: Colors.tecnibus[300],
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 8,
        }}
      >
        <Search size={16} color={Colors.tecnibus[500]} strokeWidth={2} />
        <TextInput
          style={{ flex: 1, fontSize: 14, color: "#1F2937" }}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {loading && (
          <ActivityIndicator size="small" color={Colors.tecnibus[500]} />
        )}
        {!loading && query.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color="#9CA3AF" strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions — View + map() en lugar de FlatList para evitar VirtualizedList nesting */}
      {showSuggestions && (
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            marginTop: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 6,
            maxHeight: 140,
            overflow: "hidden",
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={item.placeId}
                onPress={() => handleSelect(item)}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                  borderBottomColor: "#F3F4F6",
                  gap: 10,
                }}
              >
                <MapPin
                  size={16}
                  color={Colors.tecnibus[500]}
                  strokeWidth={2}
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#1F2937",
                    }}
                    numberOfLines={1}
                  >
                    {item.mainText}
                  </Text>
                  {!!item.secondaryText && (
                    <Text
                      style={{ fontSize: 12, color: "#6B7280", marginTop: 1 }}
                      numberOfLines={1}
                    >
                      {item.secondaryText}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
