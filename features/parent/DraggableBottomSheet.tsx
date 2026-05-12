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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export interface DraggableBottomSheetRef {
  expand: (onDone?: () => void) => void;
  collapse: (onDone?: () => void) => void;
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
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // BottomNav real height — matches BottomNavigation.tsx: bottom:7 + height:44 + safe area
  const bottomNavHeight = 7 + 44 + Math.max(insets.bottom, 8);

  // Usable height excludes the BottomNav zone
  const usableHeight = screenHeight - bottomNavHeight;

  // Sheet container: covers maxSnapPoint of usable area + bottomNavHeight as solid white backing
  const sheetHeight = usableHeight * maxSnapPoint + bottomNavHeight;

  // Keep latest usableHeight in a ref so snapToPoint callback is never stale
  const usableHeightRef = useRef(usableHeight);
  useEffect(() => {
    usableHeightRef.current = usableHeight;
  }, [usableHeight]);

  const calcOffset = useCallback(
    (point: number) => (maxSnapPoint - point) * usableHeightRef.current,
    [maxSnapPoint],
  );

  const translateY = useSharedValue(calcOffset(initialSnapPoint));
  const [currentSnapPoint, setCurrentSnapPoint] = useState(initialSnapPoint);

  // Re-snap when screen dimensions change (rotation, fold, etc.)
  const currentSnapPointRef = useRef(initialSnapPoint);
  useEffect(() => {
    translateY.value = calcOffset(currentSnapPointRef.current);
  }, [usableHeight, calcOffset, translateY]);

  const snapToPoint = useCallback(
    (point: number, onDone?: () => void) => {
      const clampedPoint = Math.max(minSnapPoint, Math.min(maxSnapPoint, point));
      const offset = calcOffset(clampedPoint);
      currentSnapPointRef.current = clampedPoint;
      setCurrentSnapPoint(clampedPoint);
      onSnapPointChange?.(clampedPoint);
      translateY.value = withSpring(
        offset,
        { damping: 25, stiffness: 120 },
        onDone ? () => { 'worklet'; runOnJS(onDone)(); } : undefined,
      );
    },
    [minSnapPoint, maxSnapPoint, onSnapPointChange, translateY, calcOffset],
  );

  useImperativeHandle(
    ref,
    () => ({
      expand: (onDone?: () => void) => snapToPoint(maxSnapPoint, onDone),
      collapse: (onDone?: () => void) => snapToPoint(minSnapPoint, onDone),
    }),
    [snapToPoint, maxSnapPoint, minSnapPoint],
  );

  const handleToggle = useCallback(() => {
    if (currentSnapPoint === minSnapPoint) {
      snapToPoint(maxSnapPoint);
    } else {
      snapToPoint(minSnapPoint);
    }
  }, [currentSnapPoint, minSnapPoint, maxSnapPoint, snapToPoint]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, { height: sheetHeight, bottom: 0 }, animatedStyle]}>
      <View style={styles.handleContainer}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleToggle}
          style={styles.handleTouchArea}
        >
          {currentSnapPoint === minSnapPoint ? (
            <ChevronUp size={20} color={Colors.tecnibus[500]} strokeWidth={3} />
          ) : (
            <ChevronDown size={20} color={Colors.tecnibus[500]} strokeWidth={3} />
          )}
          <Text style={styles.handleText}>
            {currentSnapPoint === minSnapPoint
              ? "Pulsa para ver más"
              : "Pulsa para ocultar"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
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
    paddingVertical: 6,
    paddingHorizontal: 80,
    alignItems: "center",
    gap: 2,
  },
  handleText: {
    fontSize: 11,
    color: Colors.tecnibus[600],
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
});
