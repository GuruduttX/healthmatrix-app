import { ChevronRight } from 'lucide-react-native';
import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

/** The usual size of a row's round lead: an `IconTile`, an avatar, a 3D picture in a dish. */
export const LIST_LEAD = 40;
const GAP = Spacing.three - 4;

type ListCardProps = {
  children: ReactNode;
  /** Where the dividers start: the lead's width, so they line up with the words. 0 runs them full width. */
  inset?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Rows on one white card, as on Home's Today card: a hairline between each, starting where the
 * words do. No shaded boxes inside: the rows and dividers are the structure.
 */
export function ListCard({ children, inset = LIST_LEAD, style }: ListCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Divided inset={inset}>{children}</Divided>
    </View>
  );
}

/** Children with a hairline between each, for lists that sit inside a card of their own. */
export function Divided({ children, inset = LIST_LEAD }: { children: ReactNode; inset?: number }) {
  const rows = Children.toArray(children);
  return (
    <>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i ? <View style={[styles.divider, { marginLeft: inset ? inset + GAP : 0 }]} /> : null}
          {row}
        </Fragment>
      ))}
    </>
  );
}

type ListRowProps = {
  leading?: ReactNode;
  title: ReactNode;
  /** One quiet line under the title; two at most. */
  subtitle?: ReactNode;
  /** A small tag or flag under the subtitle. */
  meta?: ReactNode;
  /** One control at the right: a switch, a round button, or a chevron when the row opens something. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Read for the whole row when the row is a button. */
  accessibilityLabel?: string;
  /** Rows that hold more, like a form row, can sit a little looser. */
  style?: StyleProp<ViewStyle>;
};

/**
 * A line on a card: a round lead, a name with one quiet line under it, and one action. A row that
 * opens something is a button and shows a `Chevron`; a row with its own button inside is not one.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  onPress,
  accessibilityLabel,
  style,
}: ListRowProps) {
  const body = (
    <>
      {leading}
      <View style={styles.words}>
        {typeof title === 'string' ? (
          <ThemedText style={styles.title} numberOfLines={1}>
            {title}
          </ThemedText>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <ThemedText style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </ThemedText>
          ) : (
            subtitle
          )
        ) : null}
        {meta ? <View style={styles.meta}>{meta}</View> : null}
      </View>
      {trailing}
    </>
  );

  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, style, pressed && styles.pressed]}>
      {body}
    </Pressable>
  ) : (
    // Not grouped into one element, so a screen reader still reaches the row's own button.
    <View style={[styles.row, style]}>{body}</View>
  );
}

/** The quiet arrow at the end of a row that opens something. */
export function Chevron() {
  return <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2.4} />;
}

/** Text styles for rows that build their own title or subtitle (a coloured word inside, say). */
export const listText = StyleSheet.create({
  title: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSoft,
  },
});

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.one,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    minHeight: 56,
    paddingVertical: Spacing.two + 3,
  },
  pressed: {
    opacity: 0.6,
  },
  words: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: listText.title,
  subtitle: listText.subtitle,
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
});
