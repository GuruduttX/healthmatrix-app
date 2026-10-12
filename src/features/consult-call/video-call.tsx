import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
// Imported up front, not on demand: a separately loaded chunk breaks in development whenever the
// dev server rebuilds while the page is open ("Requiring unknown module"). It is safe to load
// during server rendering; it touches the browser only when a call connects.
import {
  connect,
  createLocalAudioTrack,
  createLocalVideoTrack,
  type LocalVideoTrack,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteVideoTrack,
  type Room,
  type TwilioError,
  type VideoTrack,
} from 'twilio-video';

import { CallLayout, confirmLeave, WEAK_NETWORK, type CallStatus } from './call-layout';
import { type VideoCallProps } from './video-call-types';
import { WaitingRoom } from './waiting-room';

/** Twilio's code for a second connection with the same identity, which replaces the first. */
const DUPLICATE_IDENTITY = 53205;
/** Twilio's code for a room closed on purpose: the console does it to end or cancel a consult. */
const ROOM_COMPLETED = 53118;

/**
 * Why calls can't run here, or null when they can. Browsers only give a page the camera over
 * https (or on localhost). Matches `video-call.native.tsx`.
 */
export const videoUnavailableReason: string | null =
  typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia
    ? __DEV__ && typeof location !== 'undefined' && location.protocol === 'http:'
      ? // The dev server over a network address: browsers keep the camera to https and localhost.
        `Browsers only allow the camera on https or localhost, and this page is ${location.host}. On the computer running the dev server, open http://localhost:${location.port || '8081'} instead.`
      : 'This browser can’t make video calls here. Open HealthMatrix in an up-to-date Chrome, Safari or Edge over a secure (https) link, or use the app.'
    : null;

/** A Twilio video track in a <video> element, covering its box. */
function TrackVideo({ track, mirror }: { track: VideoTrack; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: mirror ? 'scaleX(-1)' : undefined,
      }}
    />
  );
}

/**
 * The consult in the browser, through Twilio's JavaScript SDK.
 * The member joins the room with no camera or mic, which puts them in the doctor's waiting list;
 * when the doctor admits them, the doctor's media arrives, and the member's own goes on.
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
  const room = useRef<Room | null>(null);
  const leaving = useRef(false);
  /** Remote audio plays from <audio> elements kept here, out of sight. */
  const audioBox = useRef<HTMLDivElement>(null);
  /** The latest mic and camera choices, for tracks that finish starting after a toggle. */
  const wanted = useRef({ audio: false, video: false });
  const starting = useRef({ audio: false, video: false });
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [admitted, setAdmitted] = useState(admittedOnJoin);
  const [doctorHere, setDoctorHere] = useState(false);
  const [remoteVideo, setRemoteVideo] = useState<RemoteVideoTrack | null>(null);
  const [remoteVideoOn, setRemoteVideoOn] = useState(true);
  const [doctorMicOn, setDoctorMicOn] = useState(true);
  const [selfVideo, setSelfVideo] = useState<LocalVideoTrack | null>(null);
  const [weakNetwork, setWeakNetwork] = useState(false);
  const micOn = lobby.micOn && canUseMic;
  const cameraOn = lobby.cameraOn && canUseCamera;
  const inCall = admitted && status !== 'connecting';

  useEffect(() => {
    let cancelled = false;
    leaving.current = false;

    const subscribed = (track: RemoteTrack) => {
      if (track.kind === 'data') return;
      // The doctor's media arriving is the sign they admitted the member.
      setAdmitted(true);
      if (track.kind === 'video') {
        setRemoteVideo(track);
        setRemoteVideoOn(track.isEnabled);
        track.on('enabled', () => setRemoteVideoOn(true));
        track.on('disabled', () => setRemoteVideoOn(false));
      } else {
        audioBox.current?.appendChild(track.attach());
        setDoctorMicOn(track.isEnabled);
        track.on('enabled', () => setDoctorMicOn(true));
        track.on('disabled', () => setDoctorMicOn(false));
      }
    };
    const unsubscribed = (track: RemoteTrack) => {
      if (track.kind === 'video') setRemoteVideo(null);
      else if (track.kind === 'audio') track.detach().forEach((element) => element.remove());
    };
    const watch = (participant: RemoteParticipant) => {
      setDoctorHere(true);
      participant.tracks.forEach((publication) => {
        if (publication.track) subscribed(publication.track);
      });
      participant.on('trackSubscribed', subscribed);
      participant.on('trackUnsubscribed', unsubscribed);
    };

    const stopLocalTracks = (current: Room) =>
      current.localParticipant.tracks.forEach((publication) => {
        if (publication.track.kind !== 'data') publication.track.stop();
      });

    void (async () => {
      let joined: Room;
      try {
        // No media yet: nothing leaves the browser until the doctor admits the member.
        joined = await connect(token, {
          name: roomName,
          tracks: [],
          networkQuality: { local: 1, remote: 1 },
        });
      } catch (error) {
        if (!cancelled) {
          onDisconnected(`The call could not connect. ${(error as Error).message ?? ''}`);
        }
        return;
      }
      if (cancelled) {
        joined.disconnect();
        return;
      }
      room.current = joined;
      setStatus('connected');

      joined.participants.forEach(watch);
      joined.on('participantConnected', watch);
      joined.on('participantDisconnected', () => {
        setDoctorHere(false);
        setRemoteVideo(null);
      });
      joined.on('reconnecting', () => setStatus('reconnecting'));
      joined.on('reconnected', () => setStatus('connected'));
      joined.localParticipant.on('networkQualityLevelChanged', (level: number) =>
        setWeakNetwork(level <= WEAK_NETWORK),
      );
      joined.on('disconnected', (_room: Room, error?: TwilioError) => {
        stopLocalTracks(joined);
        if (leaving.current) return;
        // The same member joined from another device or tab, which takes over the call.
        if (error?.code === DUPLICATE_IDENTITY) return onLeave();
        onDisconnected(undefined, error?.code === ROOM_COMPLETED);
      });
    })();

    // Closing the tab leaves the room at once instead of after Twilio's timeout.
    const leaveOnPageHide = () => room.current?.disconnect();
    window.addEventListener('pagehide', leaveOnPageHide);

    return () => {
      cancelled = true;
      leaving.current = true;
      window.removeEventListener('pagehide', leaveOnPageHide);
      const current = room.current;
      room.current = null;
      if (current) {
        stopLocalTracks(current);
        current.disconnect();
      }
    };
    // `onDisconnected` and `onLeave` are stable; the room is opened once per token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, token]);

  // Once in the call, the mic and camera follow the member's choices. Each track is created and
  // published the first time it is turned on, and enabled or disabled after that.
  useEffect(() => {
    wanted.current = { audio: micOn, video: cameraOn };
    const current = room.current;
    if (!inCall || !current) return;

    const apply = async (kind: 'audio' | 'video', on: boolean) => {
      const publications =
        kind === 'audio'
          ? current.localParticipant.audioTracks
          : current.localParticipant.videoTracks;
      const existing = [...publications.values()][0]?.track;
      if (existing) {
        if (on) existing.enable();
        else existing.disable();
        return;
      }
      if (!on || starting.current[kind]) return;
      starting.current[kind] = true;
      try {
        const track =
          kind === 'audio'
            ? await createLocalAudioTrack()
            : await createLocalVideoTrack({ width: 1280, height: 720, facingMode: 'user' });
        if (room.current !== current) {
          track.stop();
          return;
        }
        await current.localParticipant.publishTrack(track);
        // Switched off again while it was starting.
        if (!wanted.current[kind]) track.disable();
        if (track.kind === 'video') setSelfVideo(track);
      } catch (error) {
        console.warn(`[consult] Could not start the ${kind}`, error);
      } finally {
        starting.current[kind] = false;
      }
    };

    void apply('audio', micOn);
    void apply('video', cameraOn);
  }, [inCall, micOn, cameraOn]);

  const hangUp = async () => {
    if (!(await confirmLeave(doctorName))) return;
    leaving.current = true;
    room.current?.disconnect();
    onLeave();
  };

  return (
    <View style={styles.root}>
      <div ref={audioBox} style={{ display: 'none' }} />
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
            doctorHere && remoteVideo && remoteVideoOn ? <TrackVideo track={remoteVideo} /> : null
          }
          selfVideo={cameraOn && selfVideo ? <TrackVideo track={selfVideo} mirror /> : null}
          onToggleMic={lobby.onToggleMic}
          onToggleCamera={lobby.onToggleCamera}
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
});
