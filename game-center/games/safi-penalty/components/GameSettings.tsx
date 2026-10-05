import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { AUDIO_CHANNELS, type GamePreferences } from "../../../engine/preferences";
const LABELS = { music: "MUSIQA", sfx: "O‘YIN OVOZLARI", crowd: "MUXLISLAR", chicken: "SAFI REAKSIYALARI" };
export function GameSettings({ value, update, storageError }: {
  value: GamePreferences; update: (fn: (p: GamePreferences) => GamePreferences) => void; storageError: boolean;
}) {
  const { colors } = useTheme();
  return <View style={s.content}>
    <Toggle label="ASOSIY OVOZ" value={value.master} onChange={(master) => update((p) => ({ ...p, master }))} />
    <Volume label="Asosiy ovoz" value={value.masterVolume} onChange={(masterVolume) => update((p) => ({ ...p, masterVolume }))} />
    {AUDIO_CHANNELS.map((key) => <View key={key} style={[s.channel, { borderColor: colors.border }]}>
      <Toggle label={LABELS[key]} value={value.channels[key].enabled} onChange={(enabled) => update((p) => ({ ...p, channels: { ...p.channels, [key]: { ...p.channels[key], enabled } } }))} />
      <Volume label={LABELS[key]} value={value.channels[key].volume} onChange={(volume) => update((p) => ({ ...p, channels: { ...p.channels, [key]: { ...p.channels[key], volume } } }))} />
    </View>)}
    <Toggle label="HAPTICS" value={value.haptics} onChange={(haptics) => update((p) => ({ ...p, haptics }))} />
    <Toggle label="HARAKATNI KAMAYTIRISH" value={value.reduceMotion} onChange={(reduceMotion) => update((p) => ({ ...p, reduceMotion }))} />
    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Asosiy ovozni o‘chirsangiz ham har bir ovoz balandligi saqlanadi. Qurilmadagi harakatni kamaytirish sozlamasi ham hisobga olinadi.</Text>
    {storageError ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>Sozlamalar saqlanmadi. Qayta o‘zgartirib urinib ko‘ring.</Text> : null}
  </View>;
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return <View style={s.row}><Text style={[s.label, { color: colors.text }]}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: "#70BC22" }} /></View>;
}
function Volume({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(1);
  return <View style={s.row}>
    <View style={s.slider} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="adjustable" accessibilityLabel={`${label} balandligi`} accessibilityValue={{ min: 0, max: 100, now: value }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => onChange(Math.min(100, Math.max(0, value + (e.nativeEvent.actionName === "increment" ? 5 : -5))))}
      onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => onChange(Math.round(Math.max(0, Math.min(100, e.nativeEvent.locationX / width * 100))))}
      onResponderMove={(e) => onChange(Math.round(Math.max(0, Math.min(100, e.nativeEvent.locationX / width * 100))))}>
      <View pointerEvents="none" style={[s.track, { backgroundColor: colors.border }]}><View style={[s.fill, { width: `${value}%` }]} /></View>
      <View pointerEvents="none" style={[s.knob, { left: `${value}%`, backgroundColor: colors.text }]} />
    </View>
    <Text style={[s.number, { color: colors.textSecondary }]}>{value}%</Text>
  </View>;
}
const s = StyleSheet.create({
  content: { gap: 16 }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 20 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 1, flex: 1 }, channel: { gap: 6, borderTopWidth: 1, paddingTop: 10 },
  slider: { flex: 1, height: 44, justifyContent: "center", marginRight: 8 }, track: { height: 5, borderRadius: 5, overflow: "hidden" },
  fill: { height: 5, backgroundColor: "#70BC22" }, knob: { position: "absolute", width: 16, height: 16, borderRadius: 8, marginLeft: -8 },
  number: { width: 42, fontSize: 12, fontVariant: ["tabular-nums"] },
});
