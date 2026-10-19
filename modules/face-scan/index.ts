import { requireNativeView, requireOptionalNativeModule } from 'expo';
import { type ComponentType } from 'react';
import { type NativeSyntheticEvent, type ViewProps } from 'react-native';

/** One frame's reading: see `FrameReading` in `src/features/face-scan/geometry.ts`. */
export type FaceScanFrame = { t: number; r: number; g: number; b: number; skin: number; luma: number };

export type FaceScanViewProps = ViewProps & {
  /** Runs the front camera while true. */
  active: boolean;
  /** Face regions to sample, flattened [x, y, width, height, ...], from 0 to 1 in a 3:4 frame. */
  regions: number[];
  /** [x, y, width, height] of the area whose skin tone the regions' pixels must match. */
  reference: number[];
  /** Holds exposure and white balance still, so their changes don't drown out the pulse. */
  lockExposure: boolean;
  onFrame: (event: NativeSyntheticEvent<FaceScanFrame>) => void;
  onCameraError: (event: NativeSyntheticEvent<{ message: string }>) => void;
};

/**
 * The front camera, showing the member's face and reading the skin colour in the face regions on
 * every frame (iOS and Android). Null on the web, which has its own camera, and in a build made
 * before this module was added.
 */
export const FaceScanView: ComponentType<FaceScanViewProps> | null = requireOptionalNativeModule(
  'FaceScan',
)
  ? requireNativeView<FaceScanViewProps>('FaceScan')
  : null;
