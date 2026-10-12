import { StyleSheet } from 'react-native';

import { Colors, Fonts, Radius } from '@/constants/theme';

/** Text inputs in the emergency profile's list and contact editors. Same look as `TextField`. */
export const formStyles = StyleSheet.create({
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: Radius.md + 2,
    borderWidth: 1.5,
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
