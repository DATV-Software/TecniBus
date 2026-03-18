import { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native';
import { DraggableBottomSheetRef } from './DraggableBottomSheet';

/**
 * Encapsula refs y callbacks beforeShow para el tour de la pantalla del padre.
 * Permite expandir el bottom sheet y hacer scroll antes de medir elementos ocultos.
 */
export function useParentTourSetup() {
  const sheetRef = useRef<DraggableBottomSheetRef>(null);
  const sheetScrollRef = useRef<ScrollView>(null);

  const expandSheet = useCallback(async () => {
    sheetRef.current?.expand();
    // Spring con damping:25, stiffness:120 tarda ~800ms en asentarse
    await new Promise<void>(r => setTimeout(r, 900));
  }, []);

  const expandAndScrollTimeline = useCallback(async () => {
    sheetRef.current?.expand();
    await new Promise<void>(r => setTimeout(r, 900));
    sheetScrollRef.current?.scrollTo({ y: 230, animated: true });
    await new Promise<void>(r => setTimeout(r, 500));
  }, []);

  return { sheetRef, sheetScrollRef, expandSheet, expandAndScrollTimeline };
}
