import React, { createContext, useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors } from '@/lib/constants/colors';

const DEFAULT_PAD = 6;

// En Android, measureInWindow retorna coordenadas debajo del status bar,
// pero el Modal con statusBarTranslucent empieza en y=0 (top de pantalla).
// Necesitamos sumar la altura del status bar para corregir el desfase.
const STATUS_BAR_OFFSET =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

export interface TourStepData {
  id: string;
  /** Scope que identifica la pantalla (admin, driver, parent) */
  scope: string;
  order: number;
  ref: React.RefObject<View | null>;
  title: string;
  description: string;
  beforeShow?: () => Promise<void>;
  borderRadius?: number;
  padding?: number;
}

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourContextType {
  registerStep: (step: TourStepData) => void;
  unregisterStep: (id: string) => void;
  /** Inicia el tour filtrando por scope — solo muestra pasos de ESA pantalla */
  startTour: (scope: string, onComplete: () => Promise<void>) => void;
  isActive: boolean;
}

export const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const stepsMap = useRef<Map<string, TourStepData>>(new Map());
  const onCompleteRef = useRef<(() => Promise<void>) | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [sortedSteps, setSortedSteps] = useState<TourStepData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);

  const registerStep = useCallback((step: TourStepData) => {
    stepsMap.current.set(step.id, step);
  }, []);

  const unregisterStep = useCallback((id: string) => {
    stepsMap.current.delete(id);
  }, []);

  const measureStep = useCallback(
    (step: TourStepData): Promise<void> =>
      new Promise(resolve => {
        const delay = Platform.OS === 'android' ? 400 : 120;
        setTimeout(() => {
          step.ref.current?.measureInWindow((x, y, w, h) => {
            if (w > 0 || h > 0) {
              setSpotlight({
                x,
                y: y + STATUS_BAR_OFFSET,
                width: w,
                height: h,
              });
            }
            resolve();
          });
        }, delay);
      }),
    [],
  );

  const showStep = useCallback(
    async (steps: TourStepData[], idx: number) => {
      const step = steps[idx];
      if (!step) return;
      if (step.beforeShow) {
        await step.beforeShow();
      }
      await measureStep(step);
    },
    [measureStep],
  );

  const startTour = useCallback(
    (scope: string, onComplete: () => Promise<void>) => {
      // Filtrar por scope Y por ref válido — imposible mezclar roles
      const sorted = [...stepsMap.current.values()]
        .filter(step => step.scope === scope && step.ref.current !== null)
        .sort((a, b) => a.order - b.order);
      if (sorted.length === 0) {
        onComplete();
        return;
      }
      onCompleteRef.current = onComplete;
      setSortedSteps(sorted);
      setCurrentIndex(0);
      setSpotlight(null);
      setIsActive(true);
      showStep(sorted, 0);
    },
    [showStep],
  );

  const handleNext = useCallback(async () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= sortedSteps.length) {
      setIsActive(false);
      setSpotlight(null);
      onCompleteRef.current?.();
      return;
    }
    setCurrentIndex(nextIdx);
    setSpotlight(null);
    await showStep(sortedSteps, nextIdx);
  }, [currentIndex, sortedSteps, showStep]);

  const handleSkip = useCallback(() => {
    setIsActive(false);
    setSpotlight(null);
    onCompleteRef.current?.();
  }, []);

  const currentStep = sortedSteps[currentIndex] ?? null;
  const isLast = currentIndex === sortedSteps.length - 1;

  return (
    <TourContext.Provider value={{ registerStep, unregisterStep, startTour, isActive }}>
      {children}
      <Modal
        visible={isActive && !!spotlight}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleSkip}
      >
        {spotlight && currentStep && (
          <TourOverlay
            spotlight={spotlight}
            title={currentStep.title}
            description={currentStep.description}
            currentIndex={currentIndex}
            total={sortedSteps.length}
            isLast={isLast}
            onNext={handleNext}
            onSkip={handleSkip}
            borderRadius={currentStep.borderRadius}
            padding={currentStep.padding}
          />
        )}
      </Modal>
    </TourContext.Provider>
  );
}

// ── Overlay ──────────────────────────────────────────────────────────────────

interface TourOverlayProps {
  spotlight: SpotlightRect;
  title: string;
  description: string;
  currentIndex: number;
  total: number;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
  borderRadius?: number;
  padding?: number;
}

/**
 * Genera un SVG path con una ventana redondeada recortada.
 * Usa fill-rule="evenodd": dibuja el rectángulo exterior y luego
 * el rectángulo redondeado interior (en sentido contrario) para crear el "agujero".
 */
function buildCutoutPath(
  screenW: number,
  screenH: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  // Clamp radius para que no exceda la mitad del ancho/alto
  const rx = Math.min(r, w / 2);
  const ry = Math.min(r, h / 2);

  // Outer rect (clockwise)
  const outer = `M0,0 H${screenW} V${screenH} H0 Z`;

  // Inner rounded rect (counter-clockwise para evenodd)
  const inner =
    `M${x + rx},${y}` +
    ` H${x + w - rx}` +
    ` A${rx},${ry} 0 0 1 ${x + w},${y + ry}` +
    ` V${y + h - ry}` +
    ` A${rx},${ry} 0 0 1 ${x + w - rx},${y + h}` +
    ` H${x + rx}` +
    ` A${rx},${ry} 0 0 1 ${x},${y + h - ry}` +
    ` V${y + ry}` +
    ` A${rx},${ry} 0 0 1 ${x + rx},${y}` +
    ` Z`;

  return `${outer} ${inner}`;
}

function TourOverlay({
  spotlight,
  title,
  description,
  currentIndex,
  total,
  isLast,
  onNext,
  onSkip,
  borderRadius = 16,
  padding = DEFAULT_PAD,
}: TourOverlayProps) {
  const { width: screenW, height: screenH } = Dimensions.get('screen');
  const PAD = padding;
  const sx = Math.max(spotlight.x - PAD, 0);
  const sy = Math.max(spotlight.y - PAD, 0);
  const sw = Math.min(spotlight.width + PAD * 2, screenW - sx);
  const sh = spotlight.height + PAD * 2;

  // borderRadius del cutout = el del componente real + padding extra
  const cutoutRadius = borderRadius + PAD;

  const centerY = sy + sh / 2;
  const showBelow = centerY < screenH * 0.50;

  const tooltipTop = showBelow ? sy + sh + 20 : undefined;
  const tooltipBottom = !showBelow ? screenH - sy + 20 : undefined;

  const cutoutPath = buildCutoutPath(screenW, screenH, sx, sy, sw, sh, cutoutRadius);

  return (
    <View style={{ flex: 1 }}>
      {/* SVG dark overlay con recorte redondeado */}
      <Svg
        width={screenW}
        height={screenH}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Path d={cutoutPath} fill="rgba(0,0,0,0.68)" fillRule="evenodd" />
      </Svg>

      {/* Spotlight ring (borde alrededor del cutout) */}
      <View
        style={{
          position: 'absolute',
          top: sy - 2,
          left: sx - 2,
          width: sw + 4,
          height: sh + 4,
          borderRadius: cutoutRadius + 2,
          borderWidth: 2.5,
          borderColor: Colors.tecnibus[400],
        }}
      />

      {/* Arrow */}
      <View
        style={{
          position: 'absolute',
          left: Math.max(Math.min(sx + sw / 2 - 8, screenW - 28), 8),
          top: showBelow ? sy + sh + 14 : sy - 22,
          width: 0,
          height: 0,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderTopWidth: showBelow ? 0 : 10,
          borderBottomWidth: showBelow ? 10 : 0,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: showBelow ? 'transparent' : '#FFFFFF',
          borderBottomColor: showBelow ? '#FFFFFF' : 'transparent',
        }}
      />

      {/* Tooltip bubble */}
      <Animated.View
        key={`tip-${currentIndex}`}
        entering={FadeIn.duration(220)}
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          ...(showBelow ? { top: tooltipTop } : { bottom: tooltipBottom }),
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.13,
          shadowRadius: 24,
          elevation: 20,
          borderWidth: 1,
          borderColor: Colors.tecnibus[200],
        }}
      >
        {/* Progress dots */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 }}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={{
                width: i === currentIndex ? 22 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor:
                  i === currentIndex ? Colors.tecnibus[600] : Colors.tecnibus[200],
              }}
            />
          ))}
        </View>

        <Text
          style={{
            fontSize: 18,
            fontFamily: 'Cal-Sans',
            color: Colors.tecnibus[800],
            marginBottom: 8,
          }}
        >
          {title}
        </Text>

        <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 20 }}>
          {description}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={onSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{ fontSize: 14, color: '#9CA3AF', fontWeight: '500' }}>
              Saltar tutorial
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNext}
            style={{
              backgroundColor: Colors.tecnibus[600],
              borderRadius: 12,
              paddingVertical: 11,
              paddingHorizontal: 22,
              shadowColor: Colors.tecnibus[600],
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              {isLast ? '¡Entendido! 🎉' : 'Siguiente →'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}
