import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';

import { Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatTimecode, timelineFraction } from '@/lib/timecode';

export type Marker = { key: string; timecode_ms: number; tone: 'draft' | 'open' | 'resolved' };

export type PlayerHandle = {
  /** Current position in ms; pauses so the reviewer can type about the exact frame. */
  pauseAt: () => number;
  seek: (ms: number) => void;
};

type Props = { url: string; durationMs: number | null; aspect: number | null; markers: Marker[] };

/**
 * Native player (fullscreen, AirPlay, scrubbing) plus a comment track: every timecoded note is a
 * dot on the timeline, tapping one jumps the video to that moment.
 */
export const ReviewPlayer = forwardRef<PlayerHandle, Props>(function ReviewPlayer({ url, durationMs, aspect, markers }, ref) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(durationMs ?? 0);
  const [failed, setFailed] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  const player = useVideoPlayer({ uri: url }, (p) => {
    p.timeUpdateEventInterval = 0.25;
    p.loop = false;
  });
  useEventListener(player, 'timeUpdate', ({ currentTime }) => setPosition(currentTime * 1000));
  useEventListener(player, 'sourceLoad', ({ duration: seconds }) => {
    if (seconds > 0) setDuration(seconds * 1000);
  });
  useEventListener(player, 'statusChange', ({ status }) => setFailed(status === 'error'));

  useImperativeHandle(
    ref,
    () => ({
      pauseAt: () => {
        player.pause();
        const ms = Math.round(player.currentTime * 1000);
        setPosition(ms);
        return ms;
      },
      seek: (ms: number) => {
        player.pause();
        player.currentTime = ms / 1000;
        setPosition(ms);
      },
    }),
    [player],
  );

  // Vertical reels stay within half of the screen so comments remain visible below.
  const ratio = aspect && aspect > 0 ? aspect : 16 / 9;
  const boxHeight = Math.min((width - spacing.xl * 2) / ratio, height * 0.5);

  const seekFromTrack = (x: number) => {
    if (!trackWidth || !duration) return;
    const ms = Math.round((Math.max(0, Math.min(trackWidth, x)) / trackWidth) * duration);
    player.currentTime = ms / 1000;
    setPosition(ms);
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.video, { height: boxHeight, backgroundColor: '#000' }]}>
        {failed ? (
          <View style={styles.failed}>
            <Text variant="bodyMedium" style={{ color: '#fff' }}>
              Videoni ochib bo‘lmadi
            </Text>
            <Text variant="caption" style={{ color: '#bbb' }}>
              Internetni tekshirib, sahifani yangilang.
            </Text>
          </View>
        ) : (
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls allowsPictureInPicture={false} />
        )}
      </View>

      <View style={styles.trackRow}>
        <Text variant="captionMedium" style={styles.time}>
          {formatTimecode(position)}
        </Text>
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel="Video vaqt chizig‘i"
          accessibilityValue={{ text: `${formatTimecode(position)} / ${formatTimecode(duration)}` }}
          onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
          onPress={(e) => seekFromTrack(e.nativeEvent.locationX)}
          style={styles.trackHit}
        >
          <View style={[styles.track, { backgroundColor: colors.surfaceSunken }]}>
            <View style={[styles.fill, { width: `${timelineFraction(position, duration) * 100}%`, backgroundColor: colors.textTertiary }]} />
          </View>
          {markers.map((m) => (
            <Pressable
              key={m.key}
              accessibilityRole="button"
              accessibilityLabel={`Izoh ${formatTimecode(m.timecode_ms)}`}
              hitSlop={8}
              onPress={() => {
                player.pause();
                player.currentTime = m.timecode_ms / 1000;
                setPosition(m.timecode_ms);
              }}
              style={[
                styles.marker,
                {
                  left: `${timelineFraction(m.timecode_ms, duration) * 100}%`,
                  backgroundColor: m.tone === 'resolved' ? colors.success : m.tone === 'draft' ? colors.warning : colors.danger,
                  borderColor: colors.surface,
                },
              ]}
            />
          ))}
        </Pressable>
        <Text variant="caption" tone="tertiary" style={styles.time}>
          {formatTimecode(duration)}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  video: { borderRadius: radius.lg, overflow: 'hidden', width: '100%' },
  failed: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.lg },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  time: { minWidth: 44, fontVariant: ['tabular-nums'] },
  trackHit: { flex: 1, height: 28, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
  marker: { position: 'absolute', top: 7, width: 14, height: 14, marginLeft: -7, borderRadius: 7, borderWidth: 2 },
});
