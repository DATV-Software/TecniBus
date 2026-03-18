import React, { useEffect, useRef } from 'react';
import { View, ViewStyle } from 'react-native';
import { useTour } from './useTour';

interface TourStepProps {
  /** Scope de la pantalla: 'admin' | 'driver' | 'parent' */
  scope: string;
  id: string;
  order: number;
  title: string;
  description: string;
  children: React.ReactNode;
  style?: ViewStyle;
  beforeShow?: () => Promise<void>;
  /** Debe coincidir con el borderRadius real del componente envuelto */
  borderRadius?: number;
  /** Espacio extra alrededor del elemento en el spotlight (default 6) */
  padding?: number;
  /** Para anchors invisibles que no deben bloquear touches */
  pointerEvents?: 'none' | 'box-none' | 'auto' | 'box-only';
}

export function TourStep({
  scope,
  id,
  order,
  title,
  description,
  children,
  style,
  beforeShow,
  borderRadius,
  padding,
  pointerEvents = 'auto',
}: TourStepProps) {
  const ref = useRef<View>(null);
  const { registerStep, unregisterStep } = useTour();

  useEffect(() => {
    registerStep({ scope, id, order, ref, title, description, beforeShow, borderRadius, padding });
    return () => unregisterStep(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View ref={ref} collapsable={false} style={style} pointerEvents={pointerEvents}>
      {children}
    </View>
  );
}
