import { Colors } from "@/lib/constants/colors";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import {
  ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface DraggableBottomSheetRef {
  expand: () => void;
  collapse: () => void;
}

interface DraggableBottomSheetProps {
  children: ReactNode;
  initialSnapPoint?: number;
  minSnapPoint?: number;
  maxSnapPoint?: number;
  onSnapPointChange?: (snapPoint: number) => void;
}

export const DraggableBottomSheet = forwardRef<
  DraggableBottomSheetRef,
  DraggableBottomSheetProps
>(function DraggableBottomSheet(
  {
    children,
    initialSnapPoint = 0.2,
    minSnapPoint = 0.2,
    maxSnapPoint = 0.45,
    onSnapPointChange,
  },
  ref,
) {
  const translateY = useRef(
    new Animated.Value(SCREEN_HEIGHT * (1 - initialSnapPoint)),
  ).current;
  const [currentSnapPoint, setCurrentSnapPoint] = useState(initialSnapPoint);

  const snapToPoint = useCallback(
    (point: number) => {
      const clampedPoint = Math.max(minSnapPoint, Math.min(maxSnapPoint, point));
      const position = SCREEN_HEIGHT * (1 - clampedPoint);

      setCurrentSnapPoint(clampedPoint);
      onSnapPointChange?.(clampedPoint);

      Animated.spring(translateY, {
        toValue: position,
        useNativeDriver: false,
        damping: 25,
        stiffness: 120,
      }).start();
    },
    [minSnapPoint, maxSnapPoint, onSnapPointChange, translateY],
  );

  useImperativeHandle(
    ref,
    () => ({
      expand: () => snapToPoint(maxSnapPoint),
      collapse: () => snapToPoint(minSnapPoint),
    }),
    [snapToPoint, maxSnapPoint, minSnapPoint],
  );

  const handleToggle = () => {
    if (currentSnapPoint === minSnapPoint) {
      snapToPoint(maxSnapPoint);
    } else {
      snapToPoint(minSnapPoint);
    }
  };

  useEffect(() => {
    snapToPoint(initialSnapPoint);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Drag Handle - Tap to toggle */}
      <View style={styles.handleContainer}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleToggle}
          style={styles.handleTouchArea}
        >
          {/* Chevron indicator */}
          <View style={{ alignItems: "center", marginBottom: 4 }}>
            {currentSnapPoint === minSnapPoint ? (
              <ChevronUp
                size={20}
                color={Colors.tecnibus[500]}
                strokeWidth={3}
              />
            ) : (
              <ChevronDown
                size={20}
                color={Colors.tecnibus[500]}
                strokeWidth={3}
              />
            )}
          </View>

          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Helper text */}
          <Text style={styles.handleText}>
            {currentSnapPoint === minSnapPoint
              ? "Pulsa para ver más"
              : "Pulsa para ocultar"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content - Scrollable sin interferencia */}
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  handleContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  handleTouchArea: {
    paddingVertical: 12,
    paddingHorizontal: 80,
    alignItems: "center",
  },
  handle: {
    width: 56,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.tecnibus[400],
    marginVertical: 6,
  },
  handleText: {
    fontSize: 11,
    color: Colors.tecnibus[600],
    fontWeight: "600",
    letterSpacing: 0.3,
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: "#ffffff",
    overflow: "visible",
  },
});
