import { StyleSheet, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';

import { Glass } from './glass';

/**
 * A card on the page, as on Home: a pane of glass. Lists inside it use hairline dividers, not
 * shaded boxes.
 */
export function Surface({ style, children, ...props }: ViewProps) {
  return (
    <Glass style={[styles.surface, style]} {...props}>
      {children}
    </Glass>
  );
}

const styles = StyleSheet.create({
  surface: {
    padding: Spacing.three,
  },
});
