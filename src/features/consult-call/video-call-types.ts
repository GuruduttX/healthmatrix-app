import { type WaitingRoomProps } from './waiting-room';

export type VideoCallProps = {
  roomName: string;
  token: string;
  /** When the doctor started the consult, for the call timer. */
  startedAt?: string;
  /** The doctor let the member in before they joined, so skip the waiting room. */
  admitted: boolean;
  /**
   * The waiting room's content and the member's mic and camera choices, which carry into the
   * call. The waiting room's status comes from the room.
   */
  lobby: Omit<WaitingRoomProps, 'status'>;
  /** The member hung up. */
  onLeave: () => void;
  /** The room dropped on its own: the doctor ended the consult, or the network failed. */
  onDisconnected: (reason?: string) => void;
};
