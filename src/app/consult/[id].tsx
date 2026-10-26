import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CalendarX, CircleCheck, PhoneOff, Smartphone } from 'lucide-react-native';
import { useEffect, useState } from 'react';

import { CallMessage } from '@/features/consult-call/call-message';
import { useConsultCall } from '@/features/consult-call/use-consult-call';
import { VideoCall, videoUnavailableReason } from '@/features/consult-call/video-call';
import { WaitingRoom } from '@/features/consult-call/waiting-room';
import { useAppointments } from '@/features/doctors/use-appointments';

/**
 * A video consult, from the waiting room to the end of the call. Opened from the appointment's
 * "Join" button, which shows from five minutes before the slot. The doctor admits the member from
 * the console; see `features/consult-call/video-call*.tsx`. Everything here is glass on the lit
 * page except the call itself, a dark stage that turns the status bar light while it shows.
 */
export default function ConsultCallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Without the video SDK the member never enters the waiting room, so the doctor doesn't see
  // them as waiting.
  if (videoUnavailableReason) return <CallUnavailable reason={videoUnavailableReason} />;
  return <ConsultCall id={id} />;
}

function CallUnavailable({ reason }: { reason: string }) {
  return (
    <>
      <StatusBar style="dark" />
      <CallMessage
        icon={Smartphone}
        title="Join from the app"
        primary={{ label: 'Close', onPress: close }}>
        {reason}
      </CallMessage>
    </>
  );
}

const close = () => (router.canGoBack() ? router.back() : router.replace('/care'));

/** After a finished consult the member lands on Care, wherever they joined from. */
const finish = () => router.dismissTo('/care');

function ConsultCall({ id }: { id: string }) {
  useKeepAwake();
  const { appointments, refresh } = useAppointments();
  const appointment = appointments?.find((item) => item.id === id);
  const doctorName = appointment?.doctor?.name ?? 'Your doctor';
  const doctorPhotoUrl = appointment?.doctor?.photoUrl;

  const { phase, connectionIssue, onDisconnected, hangUp, rejoin } = useConsultCall(id);

  const [camera, requestCamera] = useCameraPermissions();
  const [mic, requestMic] = useMicrophonePermissions();
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  // Ask in the waiting room, so the call itself never stops for a permission prompt.
  useEffect(() => {
    if (camera && !camera.granted && camera.canAskAgain) void requestCamera();
  }, [camera, requestCamera]);
  useEffect(() => {
    if (camera?.granted !== undefined && mic && !mic.granted && mic.canAskAgain) void requestMic();
  }, [camera?.granted, mic, requestMic]);

  const canUseCamera = !!camera?.granted;
  const canUseMic = !!mic?.granted;
  const permissionsPending =
    !camera || !mic || (!camera.granted && camera.canAskAgain) || (!mic.granted && mic.canAskAgain);

  // The appointment list drops a consult once it is over.
  const over = phase.name === 'ended' || phase.name === 'closed';
  useEffect(() => {
    if (over) void refresh();
  }, [over, refresh]);

  // The waiting room, and the mic and camera choices made there, which carry into the call.
  const lobby = {
    doctorName,
    doctorPhotoUrl,
    scheduledAt: appointment?.scheduledAt,
    micOn: micOn && canUseMic,
    cameraOn: cameraOn && canUseCamera,
    onToggleMic: () => setMicOn((on) => !on),
    onToggleCamera: () => setCameraOn((on) => !on),
    canUseMic,
    canUseCamera,
    permissionsPending,
    connectionIssue,
    onClose: close,
  };

  const screen = () => {
    switch (phase.name) {
      case 'joining':
        return phase.closing ? (
          // Usually "Consult complete" a moment later; never "Reconnecting" for a call that ended.
          <CallMessage title="One moment…" />
        ) : phase.retry ? (
          <CallMessage
            title={`Reconnecting to your consult with ${doctorName}…`}
            secondary={{ label: 'Close', onPress: close }}>
            {connectionIssue ?? 'This takes a few seconds.'}
          </CallMessage>
        ) : (
          <WaitingRoom {...lobby} status="connecting" />
        );
      case 'room':
        return (
          <VideoCall
            roomName={phase.roomName}
            token={phase.token}
            startedAt={phase.startedAt}
            admitted={phase.admitted}
            lobby={lobby}
            onLeave={hangUp}
            onDisconnected={onDisconnected}
          />
        );
      case 'left':
        return (
          <CallMessage
            icon={PhoneOff}
            title="You left the call"
            primary={{ label: 'Rejoin call', onPress: rejoin }}
            secondary={{ label: 'Close', onPress: close }}>
            Your consult with {doctorName} is still open. You can rejoin until they end it.
          </CallMessage>
        );
      case 'ended':
        return (
          <CallMessage
            icon={CircleCheck}
            iconTone="success"
            title="Consult complete"
            primary={{ label: 'Done', onPress: finish }}>
            {doctorName} has ended the consult. Once they sign your prescription it appears in
            Records, and its medicines are added to your reminders.
          </CallMessage>
        );
      case 'closed':
        return (
          <CallMessage
            icon={CalendarX}
            title="You can’t join this consult"
            primary={{ label: 'Close', onPress: close }}>
            {phase.message}
          </CallMessage>
        );
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      {screen()}
    </>
  );
}
