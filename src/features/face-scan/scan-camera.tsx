import { StyleSheet } from 'react-native';

import { FaceScanView } from '../../../modules/face-scan';

import { REFERENCE, REGIONS_FLAT, type FrameReading } from './geometry';

export type ScanCameraProps = {
  active: boolean;
  lockExposure: boolean;
  onFrame: (reading: FrameReading) => void;
  onError: (message: string) => void;
};

/** Whether this build has the face scan camera (`modules/face-scan`); older builds don't. */
export const scanCameraAvailable = FaceScanView !== null;

/**
 * The front camera, filling its 3:4 box, reading the face regions on every frame. The native
 * module does the pixel work; only one small reading a frame crosses to JavaScript.
 */
export function ScanCamera({ active, lockExposure, onFrame, onError }: ScanCameraProps) {
  if (!FaceScanView) return null;
  return (
    <FaceScanView
      style={StyleSheet.absoluteFill}
      active={active}
      regions={REGIONS_FLAT}
      reference={REFERENCE}
      lockExposure={lockExposure}
      onFrame={(event) => onFrame(event.nativeEvent)}
      onCameraError={(event) => onError(event.nativeEvent.message)}
    />
  );
}
