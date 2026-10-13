import { Platform, Switch, type SwitchProps } from 'react-native';

import { Colors } from '@/constants/theme';

/** The web build's switch paints its "on" thumb teal unless told otherwise. */
const WEB_THUMB = Platform.OS === 'web' ? { activeThumbColor: Colors.backgroundElement } : null;

/**
 * An on/off switch on the warm page: blue-teal `good` when on (the colour Home uses for "On"),
 * warm grey when off, with a white thumb on every platform.
 */
export function Toggle(props: SwitchProps) {
  return (
    <Switch
      trackColor={{ false: Colors.border, true: Colors.good }}
      thumbColor={Colors.backgroundElement}
      ios_backgroundColor={Colors.border}
      {...WEB_THUMB}
      {...props}
    />
  );
}
