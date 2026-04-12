import { useEffect, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import { useSyncQueue } from '@/lib/hooks/useSyncQueue';

const BANNER_HEIGHT = 44;
const ANIM_DURATION = 320;

type BannerState = 'offline' | 'syncing' | 'failed' | 'hidden';

function getBannerState(
  isOnline: boolean,
  isSyncing: boolean,
  pendingCount: number,
  hasFailures: boolean,
): BannerState {
  if (!isOnline) return 'offline';
  if (isSyncing || pendingCount > 0) return 'syncing';
  if (hasFailures) return 'failed';
  return 'hidden';
}

const BANNER_COLORS: Record<Exclude<BannerState, 'hidden'>, string> = {
  offline: '#ef4444',   // red
  syncing: '#f59e0b',   // amber
  failed: '#dc2626',    // darker red
};

const BANNER_MESSAGES: Record<Exclude<BannerState, 'hidden'>, string> = {
  offline: 'Sin conexión a internet',
  syncing: 'Sincronizando datos...',
  failed: 'Acciones pendientes no sincronizadas',
};

export function NetworkBanner() {
  const { isOnline, retry } = useNetworkStatus();
  const { isSyncing, pendingCount, hasFailures, retryFailed, clearFailed } =
    useSyncQueue();

  const insets = useSafeAreaInsets();

  const state = getBannerState(isOnline, isSyncing, pendingCount, hasFailures);
  const visible = state !== 'hidden';

  const translateY = useSharedValue(-BANNER_HEIGHT);
  const prevVisible = useRef(false);

  useEffect(() => {
    if (visible && !prevVisible.current) {
      translateY.value = withTiming(0, {
        duration: ANIM_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    } else if (!visible && prevVisible.current) {
      translateY.value = withTiming(-BANNER_HEIGHT, {
        duration: ANIM_DURATION,
        easing: Easing.in(Easing.cubic),
      });
    }
    prevVisible.current = visible;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const bgColor = visible ? BANNER_COLORS[state] : BANNER_COLORS.offline;
  const message = visible ? BANNER_MESSAGES[state] : '';

  const handleAction = () => {
    if (state === 'offline') retry();
    else if (state === 'failed') void retryFailed();
    else if (state === 'syncing') {/* no-op while syncing */}
  };

  const actionLabel =
    state === 'offline' ? 'Reintentar'
    : state === 'failed' ? 'Reintentar'
    : null;

  const handleDismiss = () => {
    if (state === 'failed') void clearFailed();
  };

  return (
    <Animated.View
      style={[
        animStyle,
        {
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          height: BANNER_HEIGHT,
          backgroundColor: bgColor,
          flexDirection: 'row',
          alignItems: 'center',
          zIndex: 9999,
          paddingHorizontal: 12,
          gap: 8,
        },
      ]}
    >
      {/* Message */}
      <Text
        style={{
          color: '#fff',
          fontWeight: '600',
          fontSize: 13,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {message}
      </Text>

      {/* Action button */}
      {actionLabel && (
        <TouchableOpacity
          onPress={handleAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.25)',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
              {actionLabel}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Dismiss button for failures */}
      {state === 'failed' && (
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, lineHeight: 20 }}>
            ✕
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}
