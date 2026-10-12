import { useEffect, useState } from 'react';
import { type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

/** 75 -> "01:15", 3725 -> "1:02:05" */
function clock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

/** How long the consult has run, counted from when the doctor started it. */
export function CallTimer({
  startedAt,
  style,
}: {
  startedAt?: string;
  style?: StyleProp<TextStyle>;
}) {
  const [from] = useState(() => (startedAt ? Date.parse(startedAt) : Date.now()));
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.floor((Date.now() - from) / 1000)));

  useEffect(() => {
    const timer = setInterval(
      () => setSeconds(Math.max(0, Math.floor((Date.now() - from) / 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, [from]);

  return (
    <ThemedText type="small" style={[{ fontVariant: ['tabular-nums'] }, style]}>
      {clock(seconds)}
    </ThemedText>
  );
}
