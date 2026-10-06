import { StyleSheet } from 'react-native';

import { Colors, Fonts, Radius } from '@/constants/theme';

/** Text inputs on the emergency profile form. Same look as the profile screen's. */
export const formStyles = StyleSheet.create({
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.75,
  },
});
