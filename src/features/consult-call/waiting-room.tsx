import { CameraView } from 'expo-camera';
import { AlertCircle, Mic, MicOff, ShieldAlert, Video, VideoOff, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconTile } from '@/components/ui/icon-tile';
import { Chevron } from '@/components/ui/list';
import { PageBackground } from '@/components/ui/morning-light';
import { HeaderIconButton } from '@/components/ui/stack-header';
import { Colors, Fonts, Gutter, Radius, Shadows, Spacing } from '@/constants/theme';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { formatSlot } from '@/features/doctors/time';

import { CallControl } from './call-control';

/**
 * `connecting` until the member is in the Twilio room; `doctorHere` once the doctor has the consult
 * open in the console (and so sees the member waiting, with an Admit button).
 */
export type LobbyStatus = 'connecting' | 'waiting' | 'doctorHere';

export type WaitingRoomProps = {
  status: LobbyStatus;
  doctorName: string;
  doctorPhotoUrl?: string;
  /** The slot, ISO. Unknown when the screen was opened without the appointment list. */
  scheduledAt?: string;
  micOn: boolean;
  cameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  canUseMic: boolean;
  canUseCamera: boolean;
  /** Still asking for permissions, or one was refused for good and needs Settings. */
  permissionsPending: boolean;
  /** Shown under the status line when the server can't be reached. */
  connectionIssue: string | null;
  onClose: () => void;
};

const AVATAR = 96;
/** The photo in a white ring, like a framed picture on the warm page. */
const RING = AVATAR + 8;

/** A ring that grows out of the doctor's photo and fades, on a loop. */
function Pulse({ delay }: { delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const start = setTimeout(() => {
      progress.set(
        withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1),
      );
    }, delay);
    return () => clearTimeout(start);
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.9 * (1 - progress.get()),
    transform: [{ scale: 1 + progress.get() * 0.7 }],
  }));

  return <Animated.View style={[styles.pulse, style]} />;
}

const STATUS_TEXT: Record<LobbyStatus, { title: string; detail: (doctor: string) => string }> = {
  connecting: {
    title: 'Opening the waiting room…',
    detail: () => 'This takes a few seconds.',
  },
  waiting: {
    title: 'Waiting for the doctor to let you in',
    detail: (doctor) => `Keep this screen open. Your call starts as soon as ${doctor} admits you.`,
  },
  doctorHere: {
    title: 'The doctor knows you’re here',
    detail: (doctor) => `${doctor} will let you in shortly. Keep this screen open.`,
  },
};

/** The status line's dot: grey while connecting, amber while waiting, blue-teal once seen. */
const STATUS_DOT: Record<LobbyStatus, string> = {
  connecting: Colors.textMuted,
  waiting: Colors.watch,
  doctorHere: Colors.good,
};

/**
 * Where the member waits until the doctor admits them from the console. The call opens by itself
 * when they do; meanwhile the member can check how they look and set mic and camera. Nothing is
 * sent to the doctor from here: the camera preview stays on the phone. On the warm page, like the
 * rest of the app; only the call itself is dark.
 */
export function WaitingRoom({
  status,
  doctorName,
  doctorPhotoUrl,
  scheduledAt,
  micOn,
  cameraOn,
  onToggleMic,
  onToggleCamera,
  canUseMic,
  canUseCamera,
  permissionsPending,
  connectionIssue,
  onClose,
}: WaitingRoomProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const missing = [!canUseCamera && 'camera', !canUseMic && 'microphone'].filter(Boolean);
  const senses = [!canUseCamera && 'see', !canUseMic && 'hear'].filter(Boolean);
  const showCamera = cameraOn && canUseCamera;

  return (
    <View style={styles.root}>
      <PageBackground />
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <View style={styles.header}>
          <HeaderIconButton
            icon={<X size={21} color={Colors.text} strokeWidth={2.2} />}
            label="Leave the waiting room"
            onPress={onClose}
          />
          <ThemedText style={styles.headerTitle} accessibilityRole="header" numberOfLines={1}>
            Waiting room
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.doctor}>
          <View style={styles.avatarWrap}>
            {reduceMotion ? null : (
              <>
                <Pulse delay={0} />
                <Pulse delay={1200} />
              </>
            )}
            <View style={styles.avatarRing}>
              <DoctorAvatar name={doctorName} photoUrl={doctorPhotoUrl} size={AVATAR} />
            </View>
          </View>
          <ThemedText style={styles.name} numberOfLines={1}>
            {doctorName}
          </ThemedText>
          <ThemedText style={styles.slot} numberOfLines={1}>
            {scheduledAt ? `Video consult · ${formatSlot(scheduledAt)}` : 'Video consult'}
          </ThemedText>

          <View style={styles.status} accessibilityLiveRegion="polite">
            <View style={[styles.dot, { backgroundColor: STATUS_DOT[status] }]} />
            <ThemedText style={styles.statusText} numberOfLines={1}>
              {STATUS_TEXT[status].title}
            </ThemedText>
          </View>
          <ThemedText style={[styles.detail, styles.center]}>
            {STATUS_TEXT[status].detail(doctorName)}
          </ThemedText>
          {connectionIssue ? (
            <View style={styles.issue}>
              <AlertCircle size={14} color={Colors.high} strokeWidth={2.4} />
              <ThemedText style={styles.issueText}>{connectionIssue}</ThemedText>
            </View>
          ) : null}
        </View>

        {/* The shadow sits outside the preview, which clips the camera to its corners. */}
        <View style={styles.previewShadow}>
          <View style={[styles.preview, showCamera && styles.previewLive]}>
            {showCamera ? (
              <CameraView style={StyleSheet.absoluteFill} facing="front" mirror />
            ) : (
              <View style={styles.previewOff}>
                <IconTile icon={VideoOff} tone="neutral" size={52} />
                <ThemedText style={styles.previewOffText}>
                  {canUseCamera ? 'Your camera is off' : 'Camera not allowed'}
                </ThemedText>
              </View>
            )}
            <View style={styles.previewLabel}>
              <ThemedText style={styles.previewLabelText}>You</ThemedText>
              {!micOn || !canUseMic ? (
                <MicOff size={12} color={Colors.text} strokeWidth={2.4} />
              ) : null}
            </View>
          </View>
        </View>

        {missing.length > 0 && !permissionsPending ? (
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Linking.openSettings();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.permission, pressed && styles.pressed]}>
            <IconTile icon={ShieldAlert} tone="warning" size={36} />
            <ThemedText style={styles.permissionText}>
              {Platform.OS === 'web'
                ? `Allow your ${missing.join(' and ')} for this site in your browser so ${doctorName} can ${senses.join(' and ')} you.`
                : `Allow your ${missing.join(' and ')} in Settings so ${doctorName} can ${senses.join(' and ')} you. Tap to open Settings.`}
            </ThemedText>
            {Platform.OS === 'web' ? null : <Chevron />}
          </Pressable>
        ) : null}

        <View style={styles.controls}>
          <CallControl
            icon={micOn ? Mic : MicOff}
            label={micOn ? 'Mic on' : 'Mic off'}
            tone={micOn ? 'on' : 'off'}
            surface="light"
            onPress={onToggleMic}
            disabled={!canUseMic}
          />
          <CallControl
            icon={cameraOn ? Video : VideoOff}
            label={cameraOn ? 'Camera on' : 'Camera off'}
            tone={cameraOn ? 'on' : 'off'}
            surface="light"
            onPress={onToggleCamera}
            disabled={!canUseCamera}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: Spacing.three,
    paddingHorizontal: Gutter,
  },
  // StackHeader's shape, with the close button's own words for screen readers.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: Colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  doctor: {
    alignItems: 'center',
  },
  avatarWrap: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  pulse: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },
  avatarRing: {
    padding: 4,
    borderRadius: RING / 2,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.dish,
  },
  name: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: Colors.text,
  },
  slot: {
    marginTop: 2,
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  // A white pill on the page: the dot and the words carry the state.
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: '100%',
    marginTop: Spacing.three,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    flexShrink: 1,
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.text,
  },
  detail: {
    marginTop: Spacing.two,
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textFaint,
  },
  center: {
    textAlign: 'center',
    maxWidth: 320,
  },
  issue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    maxWidth: 320,
    marginTop: Spacing.two,
  },
  issueText: {
    flexShrink: 1,
    marginTop: -2,
    textAlign: 'center',
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.high,
  },
  previewShadow: {
    flex: 1,
    minHeight: 160,
    borderRadius: Radius.xl,
    boxShadow: Shadows.soft,
  },
  preview: {
    flex: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
  },
  // Behind the camera while it starts: dark, like the video it is about to show.
  previewLive: {
    borderWidth: 0,
    backgroundColor: Colors.ink,
  },
  previewOff: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two + 2,
  },
  previewOffText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  // White, so it reads on the camera's picture and on the white card alike.
  previewLabel: {
    position: 'absolute',
    left: Spacing.three - 4,
    bottom: Spacing.three - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
  },
  previewLabelText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.text,
  },
  permission: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: Spacing.three - 4,
    paddingHorizontal: Spacing.three - 2,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  permissionText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
