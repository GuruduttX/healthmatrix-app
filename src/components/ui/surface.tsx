import { StyleSheet, View, type ViewProps } from 'react-native';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

/**
 * A white card on the warm page, as on Home: a hairline edge, barely lifted. Lists inside it use
 * hairline dividers, not shaded boxes.
 */
export function Surface({ style, ...props }: ViewProps) {
  return <View style={[styles.surface, style]} {...props} />;
}

const styles = StyleSheet.create({
  surface: {
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
});
