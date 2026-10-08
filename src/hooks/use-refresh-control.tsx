import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * Pull-to-refresh for a ScrollView's `refreshControl`. `refresh` reloads what the screen shows and
 * reports its own errors; the spinner stays until it settles. Without `refresh`, returns nothing.
 */
export function useRefreshControl(refresh?: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  if (!refresh) return undefined;

  const onRefresh = () => {
    setRefreshing(true);
    refresh()
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  };

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={Colors.primary}
      colors={[Colors.primary]}
    />
  );
}
