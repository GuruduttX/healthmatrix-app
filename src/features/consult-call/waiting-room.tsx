import { CameraView } from 'expo-camera';
import { Mic, MicOff, ShieldAlert, Video, VideoOff, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { formatSlot } from '@/features/doctors/time';

import { CallControl } from './call-control';

import { CallBackdrop } from './call-backdrop';

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

const AVATAR = 104;

/** A ring that grows out of the doctor's photo and fades, on a loop. */
function Pulse({ delay }: { delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const start = setTimeout(() => {
      progress.value = withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }),
        -1,
      );
    }, delay);
    return () => clearTimeout(start);
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - progress.value),
    transform: [{ scale: 1 + progress.value * 0.9 }],
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

/**
 * Where the member waits until the doctor admits them from the console. The call opens by itself
 * when they do; meanwhile the member can check how they look and set mic and camera. Nothing is
 * sent to the doctor from here: the camera preview stays on the phone.
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
  const missing = [!canUseCamera && 'camera', !canUseMic && 'microphone'].filter(Boolean);
  const senses = [!canUseCamera && 'see', !canUseMic && 'hear'].filter(Boolean);

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.two }]}>
      <CallBackdrop />
      <View style={styles.header}>
        <ThemedText type="smallBold" style={styles.eyebrow}>
          Waiting room
        </ThemedText>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Leave the waiting room"
          hitSlop={10}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <X size={20} color={Colors.onInk} strokeWidth={2.4} />
        </Pressable>
      </View>

      <View style={styles.doctor}>
        <View style={styles.avatarWrap}>
          <Pulse delay={0} />
          <Pulse delay={1200} />
          <DoctorAvatar name={doctorName} photoUrl={doctorPhotoUrl} size={AVATAR} />
        </View>
        <ThemedText type="subtitle" style={styles.onInk} numberOfLines={1}>
          {doctorName}
        </ThemedText>
        <ThemedText type="small" style={styles.muted}>
          {scheduledAt ? `Video consult · ${formatSlot(scheduledAt)}` : 'Video consult'}
        </ThemedText>
        <View style={styles.statusPill}>
          <View
            style={[
              styles.dot,
              status === 'doctorHere' && styles.dotHere,
              status === 'connecting' && styles.dotConnecting,
            ]}
          />
          <ThemedText type="smallBold" style={styles.onInk}>
            {STATUS_TEXT[status].title}
          </ThemedText>
        </View>
        <ThemedText type="caption" style={[styles.muted, styles.center]}>
          {STATUS_TEXT[status].detail(doctorName)}
        </ThemedText>
        {connectionIssue ? (
          <ThemedText type="caption" style={[styles.issue, styles.center]}>
            {connectionIssue}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.preview}>
        {cameraOn && canUseCamera ? (
          <CameraView style={StyleSheet.absoluteFill} facing="front" mirror />
        ) : (
          <View style={styles.previewOff}>
            <VideoOff size={28} color="rgba(255, 255, 255, 0.6)" strokeWidth={2} />
            <ThemedText type="small" style={styles.muted}>
              {canUseCamera ? 'Your camera is off' : 'Camera not allowed'}
            </ThemedText>
          </View>
        )}
        <View style={styles.previewLabel}>
          <ThemedText style={styles.previewLabelText}>You</ThemedText>
          {!micOn || !canUseMic ? (
            <MicOff size={12} color={Colors.onInk} strokeWidth={2.4} />
          ) : null}
        </View>
      </View>

      {missing.length > 0 && !permissionsPending ? (
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') void Linking.openSettings();
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.permission, pressed && styles.pressed]}>
          <ShieldAlert size={18} color={Colors.warning} strokeWidth={2.4} />
          <ThemedText type="caption" style={styles.permissionText}>
            {Platform.OS === 'web'
              ? `Allow your ${missing.join(' and ')} for this site in your browser so ${doctorName} can ${senses.join(' and ')} you.`
              : `Allow your ${missing.join(' and ')} in Settings so ${doctorName} can ${senses.join(' and ')} you. Tap to open Settings.`}
          </ThemedText>
        </Pressable>
      ) : null}

      <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.three }]}>
        <CallControl
          icon={micOn ? Mic : MicOff}
          label={micOn ? 'Mic on' : 'Mic off'}
          tone={micOn ? 'on' : 'off'}
          onPress={onToggleMic}
          disabled={!canUseMic}
        />
        <CallControl
          icon={cameraOn ? Video : VideoOff}
          label={cameraOn ? 'Camera on' : 'Camera off'}
          tone={cameraOn ? 'on' : 'off'}
          onPress={onToggleCamera}
          disabled={!canUseCamera}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ink,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: Colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  doctor: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  pulse: {
    position: 'absolute',
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: Colors.primary,
  },
  onInk: {
    color: Colors.onInk,
  },
  muted: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  center: {
    textAlign: 'center',
    maxWidth: 320,
  },
  issue: {
    color: Colors.primaryLight,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryMid,
  },
  dotHere: {
    backgroundColor: '#4ADE80',
  },
  dotConnecting: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  preview: {
    flex: 1,
    minHeight: 160,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.inkMid,
  },
  previewOff: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  previewLabel: {
    position: 'absolute',
    left: Spacing.three,
    bottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(14, 42, 51, 0.6)',
  },
  previewLabelText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.onInk,
  },
  permission: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three - 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.warningSoft,
  },
  permissionText: {
    flex: 1,
    color: Colors.ink,
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
