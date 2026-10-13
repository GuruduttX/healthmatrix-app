import { StyleSheet } from 'react-native';

import { Colors, Fonts, Radius, Shadows } from '@/constants/theme';

/**
 * Shared bits of the emergency profile's list and contact editors (and the medicine form's
 * pressed state). Their text inputs are `TextField`s; `input` is the same look for a bare one.
 */
export const formStyles = StyleSheet.create({
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: Radius.lg,
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
  // A small white round button with a peach edge and an orange icon, like Home's add button.
  roundButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryTintStrong,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  roundButtonPressed: {
    backgroundColor: Colors.primaryTint,
    transform: [{ scale: 0.95 }],
  },
  roundButtonDisabled: {
    opacity: 0.4,
    boxShadow: 'none',
  },
  // A value the member entered: a white pill with an edge a step stronger than the card's.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    minHeight: 34,
    paddingVertical: 6,
    paddingLeft: 13,
    paddingRight: 9,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  pillText: {
    flexShrink: 1,
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.text,
  },
});
