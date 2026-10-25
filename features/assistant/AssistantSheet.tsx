import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components/ui';
import { brand, radius, spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { ASSISTANT_URL, askAssistant, speechUri, type AssistantMsg } from './api';

const ROBOT = require('@/assets/assistant/robot-face.png');
const STORE = 'sunny:chat:v1';

const SUGGEST_STAFF = ['Bugungi vazifalarim', 'Muddati o‘tgan vazifalar', 'Yaqin s’yomkalar', 'Post uchun caption yozib ber'];
const SUGGEST_CLIENT = ['Bu oy kontent holati', 'Loyihalarim qaysi bosqichda?', 'Yaqin s’yomkalar'];

/**
 * Sunny inside the app: a chat with the SUN MEDIA robot. Answers are read aloud in a friendly robot voice
 * (neural Uzbek voice, a little higher and faster). To talk instead of typing, use the keyboard's microphone.
 */
export function AssistantSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const me = useMe();
  const isClient = me.kind === 'client';
  const first = me.profile?.full_name?.split(' ')[0] ?? '';
  const greeting: AssistantMsg = {
    role: 'assistant',
    text: `Salom${first ? `, ${first}` : ''}! Men Sunny. ${isClient ? 'Loyihangiz va kontent rejasi haqida so‘rang.' : 'Vazifalar, s’yomkalar yoki kontent holati haqida so‘rang.'}`,
  };
  const [msgs, setMsgs] = useState<AssistantMsg[]>([greeting]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const player = useRef<AudioPlayer | null>(null);
  const bob = useRef(new Animated.Value(0)).current;
  const talk = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(STORE)
      .then((raw) => raw && setMsgs(JSON.parse(raw) as AssistantMsg[]))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(STORE, JSON.stringify(msgs.slice(-30))).catch(() => undefined);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  }, [msgs, busy]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  useEffect(() => {
    if (!speaking && !busy) {
      talk.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(talk, { toValue: 1, duration: busy ? 700 : 160, useNativeDriver: true }),
        Animated.timing(talk, { toValue: 0, duration: busy ? 700 : 180, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [speaking, busy, talk]);

  const stopVoice = useCallback(() => {
    player.current?.remove();
    player.current = null;
    setSpeaking(false);
  }, []);
  useEffect(() => (visible ? undefined : stopVoice()), [visible, stopVoice]);

  const say = useCallback(
    async (text: string) => {
      stopVoice();
      const uri = await speechUri(text);
      if (!uri) return;
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: false, interruptionMode: 'duckOthers' }).catch(() => undefined);
      const p = createAudioPlayer(uri);
      player.current = p;
      // Faster without pitch correction: the voice rises a little — Sunny's friendly robot voice.
      p.shouldCorrectPitch = false;
      p.setPlaybackRate(1.08);
      p.addListener('playbackStatusUpdate', (s) => {
        if (s.didJustFinish) stopVoice();
      });
      setSpeaking(true);
      p.play();
    },
    [stopVoice],
  );

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    stopVoice();
    const next = [...msgs, { role: 'user' as const, text }];
    setMsgs(next);
    setInput('');
    setBusy(true);
    const reply = await askAssistant(next);
    setMsgs((m) => [...m, reply]);
    setBusy(false);
    if (voiceOn && !reply.error) void say(reply.text);
  };

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const scale = talk.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const glow = talk.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] });
  const showSuggest = !msgs.some((m) => m.role === 'user') && !busy;

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}>
      <SafeAreaView edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']} style={[styles.fill, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.robotWrap}>
            <Animated.View style={[styles.halo, { opacity: glow }]} />
            <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
              <Image source={ROBOT} style={styles.robot} contentFit="contain" />
            </Animated.View>
          </View>
          <View style={styles.fill}>
            <Text variant="title">Sunny</Text>
            <Text variant="caption" tone="secondary">
              {busy ? 'O‘ylayapman…' : speaking ? 'Gapiryapman…' : 'SUN MEDIA AI yordamchisi'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: voiceOn }}
            accessibilityLabel="Javobni ovozda aytish"
            onPress={() => {
              if (voiceOn) stopVoice();
              setVoiceOn((v) => !v);
            }}
            style={[styles.round, { backgroundColor: voiceOn ? colors.accentSoft : colors.surfaceRaised }]}
          >
            <Icon name={voiceOn ? 'volume-2' : 'volume-x'} size={18} color={voiceOn ? colors.accent : colors.textSecondary} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Yopish" onPress={onClose} hitSlop={10} style={[styles.round, { backgroundColor: colors.surfaceRaised }]}>
            <Icon name="x" size={18} color={colors.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          <ScrollView ref={scroll} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            {msgs.map((m, i) => {
              const mine = m.role === 'user';
              return (
                <View key={i} style={[styles.msg, mine ? styles.mine : null]}>
                  <View style={[styles.bubble, mine ? { backgroundColor: brand.lime, borderBottomRightRadius: 6 } : { backgroundColor: colors.surfaceRaised, borderBottomLeftRadius: 6 }, m.error && { backgroundColor: colors.dangerSoft }]}>
                    <Text variant="body" style={{ color: mine ? brand.ink : m.error ? colors.danger : colors.text }}>
                      {m.text.replace(/\*\*/g, '')}
                    </Text>
                  </View>
                  {!mine && !m.error && i > 0 ? (
                    <Pressable accessibilityLabel="Ovozda eshitish" onPress={() => void say(m.text)} hitSlop={8} style={styles.replay}>
                      <Icon name="volume-2" size={14} color={colors.textTertiary} />
                    </Pressable>
                  ) : null}
                  {m.actions?.map((a, j) =>
                    a.type === 'link' ? (
                      <Pressable key={j} onPress={() => Linking.openURL(`${ASSISTANT_URL}${a.href}`)} style={[styles.chip, { borderColor: colors.accent }]}>
                        <Text variant="captionMedium" style={{ color: colors.accent }}>
                          {a.label} →
                        </Text>
                      </Pressable>
                    ) : null,
                  )}
                </View>
              );
            })}
            {busy ? (
              <View style={[styles.bubble, { backgroundColor: colors.surfaceRaised, alignSelf: 'flex-start' }]}>
                <ActivityIndicator color={colors.textSecondary} />
              </View>
            ) : null}
            {showSuggest ? (
              <View style={styles.suggest}>
                {(isClient ? SUGGEST_CLIENT : SUGGEST_STAFF).map((s) => (
                  <Pressable key={s} onPress={() => void send(s)} style={[styles.suggestItem, { borderColor: colors.borderStrong }]}>
                    <Text variant="caption">{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Yozing yoki klaviaturadagi 🎤 bilan gapiring…"
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={2000}
              style={[styles.input, { color: colors.text }]}
              onSubmitEditing={() => void send(input)}
              blurOnSubmit={false}
              returnKeyType="send"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Yuborish"
              disabled={!input.trim() || busy}
              onPress={() => void send(input)}
              style={[styles.send, { backgroundColor: brand.lime, opacity: !input.trim() || busy ? 0.35 : 1 }]}
            >
              <Icon name="arrow-up" size={20} color={brand.ink} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  robotWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: brand.lime },
  robot: { width: 64, height: 64 },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, gap: spacing.md },
  msg: { alignItems: 'flex-start', gap: spacing.xs, maxWidth: '88%' },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg },
  replay: { padding: spacing.xs },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  suggest: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  suggestItem: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, margin: spacing.md, padding: spacing.xs, paddingLeft: spacing.md, borderRadius: radius.xl, borderWidth: 1 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, paddingVertical: spacing.sm, fontSize: 15, fontFamily: 'Inter_400Regular' },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
