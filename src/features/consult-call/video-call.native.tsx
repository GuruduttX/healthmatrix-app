import {
  TwilioVideo,
  TwilioVideoLocalView,
  TwilioVideoParticipantView,
  type TrackIdentifier,
} from '@twilio/video-react-native-sdk';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, MicOff, PhoneOff, SwitchCamera, Video, VideoOff, WifiLow } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';

import { CallControl } from './call-control';
import { CallTimer } from './call-timer';
import { type VideoCallProps } from './video-call-types';

type Status = 'connecting' | 'connected' | 'reconnecting';
type RemoteVideo = TrackIdentifier & { enabled: boolean };

/** Twilio rates network quality 0 to 5; at or below this the call shows a weak-connection note. */
const WEAK_NETWORK = 1;

/**
 * The one-on-one call with the doctor: their video fills the screen, the member's own camera
 * sits in a corner, and mic, camera, flip and end controls run along the bottom.
 */
export function VideoCall({
  roomName,
  token,
  startedAt,
  doctorName,
  doctorPhotoUrl,
  initialMicOn,
  initialCameraOn,
  canUseMic,
  canUseCamera,
  onLeave,
  onDisconnected,
}: VideoCallProps) {
  const insets = useSafeAreaInsets();
  const video = useRef<TwilioVideo>(null);
  const leaving = useRef(false);
  const [status, setStatus] = useState<Status>('connecting');
  const [doctorHere, setDoctorHere] = useState(false);
  const [remoteVideo, setRemoteVideo] = useState<RemoteVideo | null>(null);
  const [doctorMicOn, setDoctorMicOn] = useState(true);
  const [micOn, setMicOn] = useState(canUseMic && initialMicOn);
  const [cameraOn, setCameraOn] = useState(canUseCamera && initialCameraOn);
  const [weakNetwork, setWeakNetwork] = useState(false);

  useEffect(() => {
    const room = video.current;
    leaving.current = false;
    room?.connect({
      roomName,
      accessToken: token,
      cameraType: 'front',
      enableAudio: canUseMic,
      enableVideo: canUseCamera,
      enableNetworkQualityReporting: true,
    });
    return () => {
      leaving.current = true;
      room?.disconnect();
    };
    // Choices made in the waiting room apply once, when the call connects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, token]);

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    void video.current?.setLocalAudioEnabled(next);
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    setCameraOn(next);
    void video.current?.setLocalVideoEnabled(next);
  };

  const hangUp = () =>
    Alert.alert(
      'Leave the consult?',
      `You can rejoin while ${doctorName} keeps the consult open.`,
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            leaving.current = true;
            video.current?.disconnect();
            onLeave();
          },
        },
      ],
    );

  const showRemote = doctorHere && remoteVideo?.enabled;
  const placeholder =
    status === 'connecting'
      ? `Connecting you to ${doctorName}…`
      : !doctorHere
        ? `Waiting for ${doctorName} to join the call`
        : `${doctorName}’s camera is off`;

  return (
    <View style={styles.root}>
      <TwilioVideo
        ref={video}
        style={styles.engine}
        onRoomDidConnect={({ participants }) => {
          setStatus('connected');
          setDoctorHere(participants.length > 0);
          // Mic and camera start on; turn off what the member switched off while waiting.
          if (canUseMic && !initialMicOn) void video.current?.setLocalAudioEnabled(false);
          if (canUseCamera && !initialCameraOn) void video.current?.setLocalVideoEnabled(false);
        }}
        onRoomDidFailToConnect={({ error }) => {
          if (!leaving.current)
            onDisconnected(`The call could not connect. ${String(error ?? '')}`);
        }}
        onRoomDidDisconnect={({ error }) => {
          if (leaving.current) return;
          // The same member joined from another device, which takes over the call.
          if (/identity/i.test(String(error ?? ''))) return onLeave();
          onDisconnected();
        }}
        onRoomIsReconnecting={() => setStatus('reconnecting')}
        onRoomDidReconnect={() => setStatus('connected')}
        onRoomParticipantDidConnect={() => setDoctorHere(true)}
        onRoomParticipantDidDisconnect={() => {
          setDoctorHere(false);
          setRemoteVideo(null);
        }}
        onParticipantAddedVideoTrack={({ participant, track }) =>
          setRemoteVideo({
            participantSid: participant.sid,
            videoTrackSid: track.trackSid,
            enabled: track.enabled,
          })
        }
        onParticipantRemovedVideoTrack={() => setRemoteVideo(null)}
        onParticipantEnabledVideoTrack={() =>
          setRemoteVideo((current) => current && { ...current, enabled: true })
        }
        onParticipantDisabledVideoTrack={() =>
          setRemoteVideo((current) => current && { ...current, enabled: false })
        }
        onParticipantAddedAudioTrack={({ track }) => setDoctorMicOn(track.enabled)}
        onParticipantEnabledAudioTrack={() => setDoctorMicOn(true)}
        onParticipantDisabledAudioTrack={() => setDoctorMicOn(false)}
        onNetworkQualityLevelsChanged={({ isLocalUser, quality }) => {
          if (isLocalUser) setWeakNetwork(quality <= WEAK_NETWORK);
        }}
      />

      {showRemote ? (
        <TwilioVideoParticipantView
          style={StyleSheet.absoluteFill}
          trackIdentifier={remoteVideo}
          scaleType="fill"
        />
      ) : (
        <View style={styles.placeholder}>
          <DoctorAvatar name={doctorName} photoUrl={doctorPhotoUrl} size={112} />
          <ThemedText type="subtitle" style={styles.onInk}>
            {doctorName}
          </ThemedText>
          <View style={styles.placeholderStatus}>
            {status === 'connecting' ? <ActivityIndicator color={Colors.onInk} /> : null}
            <ThemedText type="small" style={styles.muted}>
              {placeholder}
            </ThemedText>
          </View>
        </View>
      )}

      <LinearGradient
        colors={['rgba(14, 42, 51, 0.85)', 'rgba(14, 42, 51, 0)']}
        style={[styles.topBar, { paddingTop: insets.top + Spacing.two }]}
        pointerEvents="none">
        <View style={styles.titleRow}>
          <ThemedText type="bodyBold" style={styles.onInk} numberOfLines={1}>
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
              <ActivityIndicator size="small" color={Colors.ink} />
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
        {cameraOn && status !== 'connecting' ? (
          <TwilioVideoLocalView enabled style={styles.fill} scaleType="fill" applyZOrder />
        ) : (
          <View style={styles.selfOff}>
            <VideoOff size={20} color="rgba(255, 255, 255, 0.7)" strokeWidth={2.2} />
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
          onPress={toggleMic}
          disabled={!canUseMic}
        />
        <CallControl
          icon={cameraOn ? Video : VideoOff}
          label={cameraOn ? 'Stop video' : 'Start video'}
          tone={cameraOn ? 'on' : 'off'}
          onPress={toggleCamera}
          disabled={!canUseCamera}
        />
        <CallControl
          icon={SwitchCamera}
          label="Flip"
          onPress={() => video.current?.flipCamera()}
          disabled={!cameraOn}
        />
        <CallControl icon={PhoneOff} label="End" tone="end" onPress={hangUp} size={66} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ink,
  },
  /** The SDK's engine view; on Android it must be mounted, but it shows nothing. */
  engine: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  fill: {
    flex: 1,
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  placeholderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  onInk: {
    color: Colors.onInk,
  },
  muted: {
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.four,
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
    backgroundColor: Colors.warningSoft,
  },
  onWarning: {
    color: Colors.ink,
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
    color: 'rgba(255, 255, 255, 0.7)',
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
