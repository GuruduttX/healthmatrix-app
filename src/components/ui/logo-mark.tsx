import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

/**
 * The HealthMatrix mark's three petals, traced from `assets/images/logo-mark.png` (512 × 458) so
 * the mark stays sharp at any size and can take any colour.
 */
const PETALS = {
  top: 'M254.9 1.5L257.5 1L261.7 6.5L368.6 190.5L376.8 208.5L379.9 220.5L381.6 233.5L381.5 252.5L378.8 268.5L372.8 286.5L368.8 294.5L357.9 310.5L342.5 325.9L334.5 331.9L330.5 333.9L327.5 332.7L323.4 326.5L221.2 150.5L212.4 133.5L207.2 117.5L204.4 101.5L204.2 87.5L206.2 71.5L210.3 56.5L219.2 37.5L229 23.5L242.5 10.1L248.5 5.2Z',
  left: 'M192 198.5L210.5 198.2L228.5 201.3L240.5 205.1L249.4 209.5L252.7 211.5L253.8 214.5L140.7 412.5L132.6 422.5L126.5 428.6L110.5 440.7L94.5 448.9L75.5 454.8L63.5 456.5L43.5 456.5L37.5 455.9L19.5 451.9L9.5 447.8L2.5 443.6L1.3 441.5L1.5 440.5L6.3 431.5L116.1 240.5L134.5 222.1L144.7 214.5L165.5 204.3L181.5 200.2Z',
  bottom: 'M185 336.5L416 336.5C470 336.5 512 390 512 444L283 444C235 444 185 395 185 336.5Z',
};

/**
 * Where the mark looks centred: halfway between the middle of its box and its centre of mass.
 * It is a triangle, heavy at the bottom, so centring the box alone makes it sit low.
 */
const OPTICAL_CENTRE = { x: 256.5, y: 262 };

type LogoMarkProps = {
  /** The square the mark is centred in. */
  size: number;
  /** How much of the square the mark spans across. */
  scale?: number;
  /** Top, left and bottom petal. The brand's three oranges by default. */
  colors?: readonly [string, string, string];
  opacities?: readonly [number, number, number];
};

/** The HealthMatrix petals, optically centred in a square of `size`. */
export function LogoMark({
  size,
  scale = 0.6,
  colors = [Colors.primary, Colors.primaryMid, Colors.primaryLight],
  opacities = [1, 1, 1],
}: LogoMarkProps) {
  const box = 512 / scale;
  const viewBox = `${OPTICAL_CENTRE.x - box / 2} ${OPTICAL_CENTRE.y - box / 2} ${box} ${box}`;

  return (
    <Svg width={size} height={size} viewBox={viewBox}>
      <Path d={PETALS.top} fill={colors[0]} fillOpacity={opacities[0]} />
      <Path d={PETALS.left} fill={colors[1]} fillOpacity={opacities[1]} />
      <Path d={PETALS.bottom} fill={colors[2]} fillOpacity={opacities[2]} />
    </Svg>
  );
}
