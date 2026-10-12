export type VideoCallProps = {
  roomName: string;
  token: string;
  /** When the doctor started the consult, for the call timer. */
  startedAt?: string;
  doctorName: string;
  doctorPhotoUrl?: string;
  /** Chosen in the waiting room. */
  initialMicOn: boolean;
  initialCameraOn: boolean;
  /** False when the member refused the permission, so the call goes ahead without it. */
  canUseMic: boolean;
  canUseCamera: boolean;
  /** The member hung up. */
  onLeave: () => void;
  /** The call dropped on its own: the doctor ended the consult, or the network failed. */
  onDisconnected: (reason?: string) => void;
};
