import { StyleSheet, View, type ViewProps } from 'react-native';

import { Colors, Radius, Shadows } from '@/constants/theme';

/** White raised card: the standard container for content on the light background. */
export function Surface({ style, ...props }: ViewProps) {
  return <View style={[styles.surface, style]} {...props} />;
}

const styles = StyleSheet.create({
  surface: {
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
});
