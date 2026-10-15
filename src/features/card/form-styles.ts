import { StyleSheet } from 'react-native';

import { webBlur } from '@/components/ui/glass';
import { Colors, Fonts, Glass, Radius } from '@/constants/theme';

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
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    boxShadow: Glass.glowSmall,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.75,
  },
  // A small round of glass with an orange icon, like Home's bell.
  roundButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Glass.rim,
    backgroundColor: Glass.fillSoft,
    boxShadow: `${Glass.glowSmall}, ${Glass.shadowSmall}`,
    ...webBlur,
  },
  roundButtonPressed: {
    backgroundColor: Colors.primaryTint,
    transform: [{ scale: 0.95 }],
  },
  roundButtonDisabled: {
    opacity: 0.4,
    boxShadow: Glass.glowSmall,
  },
  // A value the member entered: a pill of glass on the card.
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
    borderColor: Glass.rim,
    backgroundColor: Glass.fillSoft,
    boxShadow: `${Glass.glowSmall}, ${Glass.shadowSmall}`,
  },
  pillText: {
    flexShrink: 1,
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.text,
  },
});
