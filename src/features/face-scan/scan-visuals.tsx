import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path, Polyline } from 'react-native-svg';

import { Colors } from '@/constants/theme';

import { OVAL } from './geometry';

/**
 * Drawn over the camera, in the same 3:4 frame the camera reads: the page dimmed around the oval
 * the face fits in, the oval (dashed until a face is in it), and the scan's progress running round
 * the oval.
 */
export function ScanOverlay({
  width,
  faceInOval,
  progress,
}: {
  width: number;
  faceInOval: boolean;
  progress: number;
}) {
  const height = width / (3 / 4);
  const cx = OVAL.cx * width;
  const cy = OVAL.cy * height;
  const rx = OVAL.rx * width;
  const ry = OVAL.ry * height;
  // Ramanujan's approximation of the ring's length, for how much of it to draw.
  const ringX = rx + 9;
  const ringY = ry + 9;
  const ringLength =
    Math.PI * (3 * (ringX + ringY) - Math.sqrt((3 * ringX + ringY) * (ringX + 3 * ringY)));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        {/* Everything but the oval, dimmed: a rectangle with the oval cut out. */}
        <Path
          d={`M0 0H${width}V${height}H0Z M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`}
          fill="rgba(14, 42, 51, 0.5)"
          fillRule="evenodd"
        />
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={faceInOval ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.6)'}
          strokeWidth={2.5}
          strokeDasharray={faceInOval ? undefined : [6, 8]}
        />
        {/* From the top, clockwise. */}
        <Path
          d={`M${cx} ${cy - ringY}A${ringX} ${ringY} 0 1 1 ${cx} ${cy + ringY}A${ringX} ${ringY} 0 1 1 ${cx} ${cy - ringY}`}
          fill="none"
          stroke={Colors.primaryBright}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={[Math.max(0.01, progress) * ringLength, ringLength]}
        />
      </Svg>
    </View>
  );
}

/** The last few seconds of the pulse wave, as a moving line under the camera. */
export function PulseTrace({ wave, width, height }: { wave: ArrayLike<number> | null; width: number; height: number }) {
  let points = '';
  if (wave && wave.length > 1) {
    let low = Infinity;
    let high = -Infinity;
    for (let i = 0; i < wave.length; i++) {
      low = Math.min(low, wave[i]!);
      high = Math.max(high, wave[i]!);
    }
    const span = high - low || 1;
    const step = width / (wave.length - 1);
    const parts: string[] = [];
    for (let i = 0; i < wave.length; i++) {
      const y = height - 4 - ((wave[i]! - low) / span) * (height - 8);
      parts.push(`${(i * step).toFixed(1)},${y.toFixed(1)}`);
    }
    points = parts.join(' ');
  }

  return (
    <Svg width={width} height={height}>
      {points ? (
        <Polyline
          points={points}
          fill="none"
          stroke={Colors.primaryDeep}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : (
        <Path d={`M0 ${height / 2}H${width}`} stroke={Colors.hairline} strokeWidth={2} />
      )}
    </Svg>
  );
}
