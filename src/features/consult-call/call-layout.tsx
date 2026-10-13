import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Mic, MicOff, PhoneOff, SwitchCamera, Video, VideoOff, WifiLow } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Gutter, Radius, Spacing } from '@/constants/theme';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';

import { CallBackdrop } from './call-backdrop';
import { CallControl } from './call-control';
import { CallTimer } from './call-timer';

export type CallStatus = 'connecting' | 'connected' | 'reconnecting';

/** Twilio rates network quality 0 to 5; at or below this the call shows a weak-connection note. */
export const WEAK_NETWORK = 1;

/** Asks before the member hangs up. `Alert` has no buttons on web, so web uses `confirm`. */
export function confirmLeave(doctorName: string) {
  const message = `You can rejoin while ${doctorName} keeps the consult open.`;
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`Leave the consult?\n\n${message}`) ?? false);
  }
  return new Promise<boolean>((resolve) =>
    Alert.alert('Leave the consult?', message, [
      { text: 'Stay', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Leave', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

type CallLayoutProps = {
  doctorName: string;
  doctorPhotoUrl?: string;
  startedAt?: string;
  status: CallStatus;
  doctorHere: boolean;
  doctorMicOn: boolean;
  weakNetwork: boolean;
  micOn: boolean;
  cameraOn: boolean;
  canUseMic: boolean;
  canUseCamera: boolean;
  /** The doctor's video, filling the screen. Null shows their photo and the call's state. */
  remoteVideo: ReactNode | null;
  /** The member's own camera, in the corner. Null shows "Camera off". */
  selfVideo: ReactNode | null;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  /** Omitted where the camera can't be flipped. */
  onFlipCamera?: () => void;
  onEnd: () => void;
};

/**
 * What the call looks like on every platform: the doctor's video fills the screen, the member's
 * own camera sits in a corner, and mic, camera, flip and end controls run along the bottom. The
 * platform files (`video-call.native.tsx`, `video-call.tsx`) supply the video and the controls'
 * effects. The one dark screen in the app, as video calls are: light status bar text while it shows.
 */
export function CallLayout({
  doctorName,
  doctorPhotoUrl,
  startedAt,
  status,
  doctorHere,
  doctorMicOn,
  weakNetwork,
  micOn,
  cameraOn,
  canUseMic,
  canUseCamera,
  remoteVideo,
  selfVideo,
  onToggleMic,
  onToggleCamera,
  onFlipCamera,
  onEnd,
}: CallLayoutProps) {
  const insets = useSafeAreaInsets();
  const placeholder =
    status === 'connecting'
      ? `Connecting you to ${doctorName}…`
      : !doctorHere
        ? `Waiting for ${doctorName} to join the call`
        : `${doctorName}’s camera is off`;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {remoteVideo ? (
        <View style={styles.cover}>{remoteVideo}</View>
      ) : (
        <View style={[styles.cover, styles.placeholder]}>
          <CallBackdrop />
          <DoctorAvatar name={doctorName} photoUrl={doctorPhotoUrl} size={112} />
          <ThemedText style={styles.placeholderName} numberOfLines={1}>
            {doctorName}
          </ThemedText>
          <View style={styles.placeholderStatus}>
            {status === 'connecting' ? <ActivityIndicator color={Colors.onInk} /> : null}
            <ThemedText style={[styles.muted, styles.placeholderText]}>{placeholder}</ThemedText>
          </View>
        </View>
      )}

      {/* Ink fading into the video, so the name and timer read on any picture. */}
      <LinearGradient
        colors={['rgba(14, 42, 51, 0.85)', 'rgba(14, 42, 51, 0)']}
        style={[styles.topBar, { paddingTop: insets.top + Spacing.two }]}>
        <View style={styles.titleRow}>
          <ThemedText style={[styles.onInk, styles.name]} numberOfLines={1}>
            {doctorName}
          </ThemedText>
          {doctorHere && !doctorMicOn ? (
            <View style={styles.badge}>
              <MicOff size={12} color={Colors.onInk} strokeWidth={2.4} />
              <ThemedText style={styles.badgeText}>Muted</ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.titleRow}>
          {status === 'reconnecting' ? (
            <View style={[styles.badge, styles.warning]}>
              <ActivityIndicator size="small" color={Colors.watch} />
              <ThemedText style={[styles.badgeText, styles.onWarning]}>Reconnecting…</ThemedText>
            </View>
          ) : (
            <CallTimer startedAt={startedAt} style={styles.muted} />
          )}
          {weakNetwork && status === 'connected' ? (
            <View style={styles.badge}>
              <WifiLow size={12} color={Colors.onInk} strokeWidth={2.4} />
              <ThemedText style={styles.badgeText}>Weak connection</ThemedText>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <View style={[styles.selfView, { top: insets.top + 76 }]}>
        {selfVideo ?? (
          <View style={styles.selfOff}>
            <VideoOff size={20} color={Colors.onInkMuted} strokeWidth={2.2} />
            <ThemedText style={styles.selfOffText}>
              {canUseCamera ? 'Camera off' : 'No camera'}
            </ThemedText>
          </View>
        )}
      </View>

      <LinearGradient
        colors={['rgba(14, 42, 51, 0)', 'rgba(14, 42, 51, 0.9)']}
        style={[styles.controls, { paddingBottom: insets.bottom + Spacing.three }]}>
        <CallControl
          icon={micOn ? Mic : MicOff}
          label={micOn ? 'Mute' : 'Unmute'}
          tone={micOn ? 'on' : 'off'}
          onPress={onToggleMic}
          disabled={!canUseMic}
        />
        <CallControl
          icon={cameraOn ? Video : VideoOff}
          label={cameraOn ? 'Stop video' : 'Start video'}
          tone={cameraOn ? 'on' : 'off'}
          onPress={onToggleCamera}
          disabled={!canUseCamera}
        />
        {onFlipCamera ? (
          <CallControl
            icon={SwitchCamera}
            label="Flip"
            onPress={onFlipCamera}
            disabled={!cameraOn}
          />
        ) : null}
        <CallControl icon={PhoneOff} label="End" tone="end" onPress={onEnd} size={66} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: Colors.ink,
  },
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  placeholderName: {
    marginTop: Spacing.two,
    fontFamily: Fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: Colors.onInk,
  },
  placeholderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  placeholderText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  name: {
    flexShrink: 1,
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  onInk: {
    color: Colors.onInk,
  },
  muted: {
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
  },
  topBar: {
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Gutter,
    paddingBottom: Spacing.five,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.onInk,
  },
  warning: {
    backgroundColor: Colors.watchSoft,
  },
  onWarning: {
    color: Colors.watch,
  },
  selfView: {
    position: 'absolute',
    right: Spacing.three,
    width: 108,
    height: 152,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: Colors.inkMid,
  },
  selfOff: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  selfOffText: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.onInkMuted,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.three,
  },
});
