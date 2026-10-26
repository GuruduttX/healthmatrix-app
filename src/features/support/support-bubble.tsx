import { Check, CheckCheck, Clock, Headset } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { glassSurface } from '@/components/ui/glass';
import { Colors, Fonts, Glass, Spacing } from '@/constants/theme';

import { messageTime } from './format';
import { type SupportMessage } from './types';

/** The team's round mark beside their replies. */
const AVATAR = 28;

export type Delivery = 'sending' | 'sent' | 'seen';

type SupportBubbleProps = {
  message: SupportMessage;
  /** The first of the team's replies in a row: shows the mark and who wrote it. */
  first?: boolean;
  /** Under the member's latest message: on its way, sent, or seen by the team. */
  delivery?: Delivery;
};

const DELIVERY = {
  sending: { icon: Clock, label: 'Sending…' },
  sent: { icon: Check, label: 'Sent' },
  seen: { icon: CheckCheck, label: 'Seen' },
} as const;

/**
 * One line of a support chat, as Ekaay's chat draws them: the member's own words in quiet ink at
 * the right, the team's replies as glass at the left beside their mark.
 */
export function SupportBubble({ message, first = true, delivery }: SupportBubbleProps) {
  const time = messageTime(message.at);

  if (message.from === 'member') {
    const status = delivery && DELIVERY[delivery];
    return (
      <View style={styles.memberColumn}>
        <View style={[styles.bubble, styles.member, delivery === 'sending' && styles.sending]}>
          <ThemedText style={[styles.text, styles.memberText]}>{message.text}</ThemedText>
          <ThemedText style={[styles.time, styles.memberTime]}>{time}</ThemedText>
        </View>
        {status ? (
          <View style={styles.delivery} accessibilityLiveRegion="polite">
            <status.icon
              size={13}
              color={delivery === 'seen' ? Colors.good : Colors.textFaint}
              strokeWidth={2.4}
            />
            <ThemedText style={[styles.deliveryText, delivery === 'seen' && styles.seen]}>
              {status.label}
            </ThemedText>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.supportRow, !first && styles.followOn]}>
      {first ? (
        <View style={[glassSurface.small, styles.avatar]}>
          <Headset size={15} color={Colors.primaryDeep} strokeWidth={2.3} />
        </View>
      ) : (
        <View style={styles.avatarSpace} />
      )}
      <View style={styles.supportColumn}>
        {first ? (
          <ThemedText style={styles.agent} numberOfLines={1}>
            {message.agentName ? `${message.agentName} · HealthMatrix support` : 'HealthMatrix support'}
          </ThemedText>
        ) : null}
        <View style={[styles.bubble, glassSurface.card, styles.support]}>
          <ThemedText style={styles.text}>{message.text}</ThemedText>
          <ThemedText style={styles.time}>{time}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    paddingTop: 10,
    paddingBottom: 7,
    paddingHorizontal: Spacing.three - 2,
    borderRadius: 20,
    gap: 2,
  },
  memberColumn: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    maxWidth: '84%',
    gap: 4,
  },
  // The member's own words: a quiet ink bubble, as in Ekaay's chat.
  member: {
    borderBottomRightRadius: 6,
    backgroundColor: Colors.text,
    boxShadow: Glass.shadowSmall,
  },
  sending: {
    opacity: 0.6,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    maxWidth: '90%',
  },
  // Replies in a row sit closer, under the first one's mark and name.
  followOn: {
    marginTop: -(Spacing.three - 2) + 4,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    marginTop: 20,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSpace: {
    width: AVATAR,
  },
  supportColumn: {
    flexShrink: 1,
    gap: 4,
  },
  agent: {
    marginLeft: 4,
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textFaint,
  },
  support: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 6,
  },
  text: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
  memberText: {
    color: Colors.onInk,
  },
  time: {
    alignSelf: 'flex-end',
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textFaint,
    fontVariant: ['tabular-nums'],
  },
  memberTime: {
    color: Colors.onInkMuted,
  },
  delivery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  deliveryText: {
    fontFamily: Fonts.semibold,
    fontSize: 11.5,
    lineHeight: 15,
    color: Colors.textFaint,
  },
  seen: {
    color: Colors.good,
  },
});
