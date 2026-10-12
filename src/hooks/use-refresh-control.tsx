import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { Colors } from '@/constants/theme';

type RefreshOptions = {
  /** iOS spinner colour; brand orange by default. Use white when pulling down over a dark header. */
  tintColor?: string;
  /** Android: how far down the spinner appears, e.g. below a status bar the screen draws under. */
  progressViewOffset?: number;
};

/**
 * Pull-to-refresh for a ScrollView's `refreshControl`. `refresh` reloads what the screen shows and
 * reports its own errors; the spinner stays until it settles. Without `refresh`, returns nothing.
 */
export function useRefreshControl(refresh?: () => Promise<unknown>, options: RefreshOptions = {}) {
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
      tintColor={options.tintColor ?? Colors.primary}
      colors={[Colors.primary]}
      progressViewOffset={options.progressViewOffset}
    />
  );
}
