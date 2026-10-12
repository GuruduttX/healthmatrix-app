import {
  TwilioVideo,
  TwilioVideoLocalView,
  TwilioVideoParticipantView,
  type TrackIdentifier,
} from '@twilio/video-react-native-sdk';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, NativeModules, Platform, StyleSheet, UIManager, View } from 'react-native';

import { CallLayout, confirmLeave, WEAK_NETWORK, type CallStatus } from './call-layout';
import { type VideoCallProps } from './video-call-types';
import { WaitingRoom } from './waiting-room';

/**
 * Why calls can't run in this build, or null when they can. The Twilio SDK is native code, so
 * Expo Go and builds made before it was added don't have it, and the SDK would crash on mount.
 */
export const videoUnavailableReason = (
  Platform.OS === 'ios'
    ? NativeModules.TWVideoModule
    : UIManager.hasViewManagerConfig('RNCustomTwilioVideoView')
)
  ? null
  : 'This version of HealthMatrix can’t make video calls. Install the latest version of the app to join your consult.';

/** Lets the waiting room's camera preview release the camera before Twilio takes it. */
const CAMERA_HANDOVER_MS = 400;

type RemoteVideo = TrackIdentifier & { enabled: boolean };

/**
 * The consult on iOS and Android, through Twilio's React Native SDK. The member joins the room
 * with no camera or mic, which puts them in the doctor's waiting list; when the doctor admits
 * them, the doctor's media arrives, and the member's own mic and camera go on.
 */
export function VideoCall({
  roomName,
  token,
  startedAt,
  admitted: admittedOnJoin,
  lobby,
  onLeave,
  onDisconnected,
}: VideoCallProps) {
  const { doctorName, doctorPhotoUrl, canUseMic, canUseCamera } = lobby;
  const video = useRef<TwilioVideo>(null);
  const leaving = useRef(false);
  const mediaStarted = useRef(false);
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [admitted, setAdmitted] = useState(admittedOnJoin);
  const [doctorHere, setDoctorHere] = useState(false);
  const [remoteVideo, setRemoteVideo] = useState<RemoteVideo | null>(null);
  const [doctorMicOn, setDoctorMicOn] = useState(true);
  const [weakNetwork, setWeakNetwork] = useState(false);
  const micOn = lobby.micOn && canUseMic;
  const cameraOn = lobby.cameraOn && canUseCamera;
  const inCall = admitted && status !== 'connecting';

  useEffect(() => {
    const room = video.current;
    leaving.current = false;
    // No media yet: nothing leaves the phone until the doctor admits the member.
    room?.connect({
      roomName,
      accessToken: token,
      cameraType: 'front',
      enableAudio: false,
      enableVideo: false,
      enableNetworkQualityReporting: true,
    });
    return () => {
      leaving.current = true;
      room?.disconnect();
    };
  }, [roomName, token]);

  // Once in the call, the mic and camera follow the member's choices. The SDK creates and
  // publishes each track the first time it is turned on.
  useEffect(() => {
    if (!inCall) {
      mediaStarted.current = false;
      return;
    }
    const timer = setTimeout(
      () => {
        mediaStarted.current = true;
        void video.current?.setLocalAudioEnabled(micOn);
        void video.current?.setLocalVideoEnabled(cameraOn);
      },
      mediaStarted.current ? 0 : CAMERA_HANDOVER_MS,
    );
    return () => clearTimeout(timer);
  }, [inCall, micOn, cameraOn]);

  // During the call Android's back button does nothing; the End button asks first.
  useEffect(() => {
    if (!admitted) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [admitted]);

  const hangUp = async () => {
    if (!(await confirmLeave(doctorName))) return;
    leaving.current = true;
    video.current?.disconnect();
    onLeave();
  };

  /** The doctor's media arriving is the sign they admitted the member. */
  const doctorPublished = () => setAdmitted(true);

  return (
    <View style={styles.root}>
      <TwilioVideo
        ref={video}
        style={styles.engine}
        onRoomDidConnect={({ participants }) => {
          setStatus('connected');
          setDoctorHere(participants.length > 0);
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
        onParticipantAddedVideoTrack={({ participant, track }) => {
          doctorPublished();
          setRemoteVideo({
            participantSid: participant.sid,
            videoTrackSid: track.trackSid,
            enabled: track.enabled,
          });
        }}
        onParticipantRemovedVideoTrack={() => setRemoteVideo(null)}
        onParticipantEnabledVideoTrack={() =>
          setRemoteVideo((current) => current && { ...current, enabled: true })
        }
        onParticipantDisabledVideoTrack={() =>
          setRemoteVideo((current) => current && { ...current, enabled: false })
        }
        onParticipantAddedAudioTrack={({ track }) => {
          doctorPublished();
          setDoctorMicOn(track.enabled);
        }}
        onParticipantEnabledAudioTrack={() => setDoctorMicOn(true)}
        onParticipantDisabledAudioTrack={() => setDoctorMicOn(false)}
        onNetworkQualityLevelsChanged={({ isLocalUser, quality }) => {
          if (isLocalUser) setWeakNetwork(quality <= WEAK_NETWORK);
        }}
      />

      {admitted ? (
        <CallLayout
          doctorName={doctorName}
          doctorPhotoUrl={doctorPhotoUrl}
          startedAt={startedAt}
          status={status}
          doctorHere={doctorHere}
          doctorMicOn={doctorMicOn}
          weakNetwork={weakNetwork}
          micOn={micOn}
          cameraOn={cameraOn}
          canUseMic={canUseMic}
          canUseCamera={canUseCamera}
          remoteVideo={
            doctorHere && remoteVideo?.enabled ? (
              <TwilioVideoParticipantView
                style={styles.fill}
                trackIdentifier={remoteVideo}
                scaleType="fill"
              />
            ) : null
          }
          selfVideo={
            cameraOn && inCall ? (
              <TwilioVideoLocalView enabled style={styles.fill} scaleType="fill" applyZOrder />
            ) : null
          }
          onToggleMic={lobby.onToggleMic}
          onToggleCamera={lobby.onToggleCamera}
          onFlipCamera={() => video.current?.flipCamera()}
          onEnd={hangUp}
        />
      ) : (
        <WaitingRoom
          {...lobby}
          status={status === 'connecting' ? 'connecting' : doctorHere ? 'doctorHere' : 'waiting'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
});
