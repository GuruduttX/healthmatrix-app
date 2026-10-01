import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar } from '@/constants/theme';

/** Space the floating tab bar (and its raised centre button) takes at the bottom of a tab screen. */
export function useTabBarClearance() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, TabBar.bottomGap) + TabBar.height + TabBar.centerLift;
}
