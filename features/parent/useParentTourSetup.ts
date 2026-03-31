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
    await new Promise<void>(r => {
      if (sheetRef.current) {
        sheetRef.current.expand(r);
      } else {
        r();
      }
    });
    // Small extra delay so layout commits after animation
    await new Promise<void>(r => setTimeout(r, 80));
  }, []);

  const expandAndScrollTimeline = useCallback(async () => {
    await new Promise<void>(r => {
      if (sheetRef.current) {
        sheetRef.current.expand(r);
      } else {
        r();
      }
    });
    await new Promise<void>(r => setTimeout(r, 80));
    sheetScrollRef.current?.scrollTo({ y: 230, animated: true });
    await new Promise<void>(r => setTimeout(r, 400));
  }, []);

  return { sheetRef, sheetScrollRef, expandSheet, expandAndScrollTimeline };
}
