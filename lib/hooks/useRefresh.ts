import { useState, useCallback } from "react";

/**
 * Hook reutilizable para pull-to-refresh en ScrollView y FlatList.
 *
 * Uso:
 *   const { refreshing, onRefresh } = useRefresh(cargarDatos);
 *   <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
 */
export function useRefresh(fn: () => Promise<unknown> | unknown) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fn();
    } finally {
      setRefreshing(false);
    }
  }, [fn]);

  return { refreshing, onRefresh };
}
