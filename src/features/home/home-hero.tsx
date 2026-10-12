import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Bell, MessageCircle, Mic, ShieldCheck, Sparkles } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { HeroBackground } from '@/components/ui/hero-background';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { MemberAvatar } from '@/features/profile/member-avatar';

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Space under the hero's content that the quick actions card overlaps. */
export const HERO_OVERLAP = 44;

/** A faint heartbeat line across the top right of the hero. */
function PulseLine({ top }: { top: number }) {
  return (
    <Svg width={240} height={56} viewBox="0 0 240 56" style={[styles.pulseLine, { top: top + 58 }]}>
      <Path
        d="M0 30 H96 L106 30 L114 12 L124 48 L134 4 L144 40 L150 30 H240"
        stroke={Colors.onInk}
        strokeOpacity={0.09}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

type HomeHeroProps = {
  name: string;
  photoUrl?: string;
  /** "Plus", "Family"; the member's plan. */
  planName?: string;
  abhaLinked?: boolean;
  hasUnread: boolean;
  /** Safe-area inset at the top; the hero runs under the status bar. */
  topInset: number;
  suggestions: string[];
  onPressProfile: () => void;
  onPressNotifications?: () => void;
  /** Opens Ekaay, asking `question` when one was tapped. */
  onAsk: (question?: string) => void;
};

/** Top of Home: who's signed in, and the way into Ekaay, on the ink gradient. */
export function HomeHero({
  name,
  photoUrl,
  planName,
  abhaLinked,
  hasUnread,
  topInset,
  suggestions,
  onPressProfile,
  onPressNotifications,
  onAsk,
}: HomeHeroProps) {
  const firstName = name.trim().split(/\s+/)[0] ?? '';

  return (
    <View style={styles.hero}>
      <HeroBackground />
      <PulseLine top={topInset} />

      <View style={[styles.content, { paddingTop: topInset + Spacing.three - 4 }]}>
        <View style={styles.topRow}>
          <Pressable
            onPress={onPressProfile}
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
            hitSlop={4}
            style={({ pressed }) => [styles.avatarRing, pressed && styles.pressed]}>
            <MemberAvatar name={name} photoUrl={photoUrl} size={46} />
          </Pressable>

          <View style={styles.flex}>
            <ThemedText type="small" style={styles.greeting}>
              {greeting(new Date().getHours())}
            </ThemedText>
            <ThemedText numberOfLines={1} style={styles.name}>
              {firstName}
            </ThemedText>
          </View>

          <Pressable
            onPress={onPressNotifications}
            accessibilityRole="button"
            accessibilityLabel={hasUnread ? 'Notifications, unread' : 'Notifications'}
            style={({ pressed }) => [styles.bell, pressed && styles.pressed]}>
            <Bell size={20} color={Colors.onInk} strokeWidth={2} />
            {hasUnread ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        </View>

        {planName || abhaLinked ? (
          <View style={styles.badges}>
            {planName ? (
              <View style={[styles.badge, styles.planBadge]}>
                <BadgeCheck size={13} color={Colors.primaryLight} strokeWidth={2.4} />
                <ThemedText style={[styles.badgeText, { color: Colors.primaryLight }]}>
                  {planName} member
                </ThemedText>
              </View>
            ) : null}
            {abhaLinked ? (
              <View style={[styles.badge, styles.abhaBadge]}>
                <ShieldCheck size={13} color={ABHA_GREEN} strokeWidth={2.4} />
                <ThemedText style={[styles.badgeText, { color: ABHA_GREEN }]}>ABHA linked</ThemedText>
              </View>
            ) : null}
          </View>
        ) : null}

        <Pressable
          onPress={() => onAsk()}
          accessibilityRole="button"
          accessibilityLabel="Ask Ekaay. Answers from your own records"
          style={({ pressed }) => [styles.ask, pressed && styles.askPressed]}>
          <LinearGradient
            colors={[Colors.primaryMid, Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.askIcon}>
            <Sparkles size={18} color={Colors.onInk} strokeWidth={2.2} />
          </LinearGradient>
          <View style={styles.flex}>
            <ThemedText type="bodyBold" numberOfLines={1}>
              Ask Ekaay
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              Answers from your own records
            </ThemedText>
          </View>
          <View style={styles.mic}>
            <Mic size={18} color={Colors.text} strokeWidth={2} />
          </View>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestions}
          contentContainerStyle={styles.suggestionsContent}>
          {suggestions.map((question) => (
            <Pressable
              key={question}
              onPress={() => onAsk(question)}
              accessibilityRole="button"
              accessibilityLabel={`Ask Ekaay: ${question}`}
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
              <MessageCircle size={13} color={Colors.onInkMuted} strokeWidth={2.2} />
              <ThemedText type="small" style={styles.suggestionText}>
                {question}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

/** Brand green, lifted so it reads on ink. */
const ABHA_GREEN = '#7FD6C2';

const styles = StyleSheet.create({
  hero: {
    // Room for the quick actions card to overlap the bottom edge.
    paddingBottom: HERO_OVERLAP + Spacing.four,
    // Shows at the rounded bottom corners; the screen behind the hero is dark.
    backgroundColor: Colors.background,
  },
  pulseLine: {
    position: 'absolute',
    right: -12,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  avatarRing: {
    padding: 2,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: 'rgba(246, 175, 145, 0.55)',
  },
  greeting: {
    color: Colors.onInkMuted,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: Colors.onInk,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.ink,
    backgroundColor: Colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: -Spacing.one,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  planBadge: {
    borderColor: 'rgba(246, 175, 145, 0.3)',
    backgroundColor: 'rgba(221, 67, 1, 0.18)',
  },
  abhaBadge: {
    borderColor: 'rgba(127, 214, 194, 0.28)',
    backgroundColor: 'rgba(16, 128, 109, 0.22)',
  },
  badgeText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    marginTop: Spacing.one,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: Radius.xl - 4,
    backgroundColor: Colors.backgroundElement,
    boxShadow: '0 14px 36px rgba(0, 0, 0, 0.28)',
  },
  askPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },
  askIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  suggestions: {
    flexGrow: 0,
    marginHorizontal: -Spacing.three,
  },
  suggestionsContent: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  suggestionText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    lineHeight: 18,
  },
});
