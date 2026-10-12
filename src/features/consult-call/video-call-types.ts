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
  /**
   * The room dropped on its own. `closed`: it was closed on purpose (the doctor ended or
   * cancelled the consult), so check what happened straight away instead of reconnecting.
   */
  onDisconnected: (reason?: string, closed?: boolean) => void;
};
