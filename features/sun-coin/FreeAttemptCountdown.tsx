import { useEffect, useRef, useState } from 'react';
import { type StyleProp, type TextStyle } from 'react-native';

import { Text } from '@/components/ui';
import { countdownLabel, formatCountdown, remainingMs } from './coinMotion';

/**
 * "03:42:18" until the next free Reward Mode attempt, on the server's clock (nextFreeAt from the server, corrected
 * by the measured clock offset), so a restart or a wrong device clock cannot change it. Only this text re-renders.
 */
export function FreeAttemptCountdown({ nextFreeAt, offsetMs = 0, onElapsed, style }: {
  nextFreeAt: string | null | undefined;
  offsetMs?: number;
  onElapsed?: () => void;
  style?: StyleProp<TextStyle>;
}) {
  const [left, setLeft] = useState(() => remainingMs(nextFreeAt, offsetMs));
  const elapsed = useRef(onElapsed);
  elapsed.current = onElapsed;
  useEffect(() => {
    const initial = remainingMs(nextFreeAt, offsetMs);
    const anchor = performance.now();
    setLeft(initial);
    if (!nextFreeAt) return;
    let fired = false;
    const id = setInterval(() => {
      const next = Math.max(0, initial - (performance.now() - anchor));
      setLeft(next);
      if (next <= 0 && !fired) {
        fired = true;
        elapsed.current?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [nextFreeAt, offsetMs]);
  // The spoken label changes per minute, so screen readers are not flooded every second.
  return (
    <Text style={[{ fontVariant: ['tabular-nums'] }, style]} accessibilityLabel={`Keyingi bepul urinishgacha ${countdownLabel(left)}`}>
      {formatCountdown(left)}
    </Text>
  );
}
