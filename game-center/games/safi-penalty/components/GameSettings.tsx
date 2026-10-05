import { StyleSheet, Switch, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import type { GamePreferences } from "../../../engine/preferences";
export function GameSettings({ value, update, storageError }: {
  value: GamePreferences; update: (fn: (p: GamePreferences) => GamePreferences) => void; storageError: boolean;
}) {
  const { colors } = useTheme();
  return <View style={s.content}>
    <Toggle label="OVOZ" value={value.master} onChange={(master) => update((p) => ({ ...p, master }))} />
    <Toggle label="MUSIQA" value={value.channels.music.enabled} onChange={(enabled) => update((p) => ({ ...p, channels: { ...p.channels, music: { ...p.channels.music, enabled } } }))} />
    <Toggle label="O‘YIN OVOZLARI" value={value.channels.sfx.enabled} onChange={(enabled) => update((p) => ({ ...p, channels: { ...p.channels, sfx: { ...p.channels.sfx, enabled } } }))} />
    <Toggle label="TITRASH" value={value.haptics} onChange={(haptics) => update((p) => ({ ...p, haptics }))} />
    <Toggle label="HARAKATNI KAMAYTIRISH" value={value.reduceMotion} onChange={(reduceMotion) => update((p) => ({ ...p, reduceMotion }))} />
    {storageError ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>Sozlamalar saqlanmadi. Qayta urinib ko‘ring.</Text> : null}
  </View>;
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return <View style={s.row}><Text style={[s.label, { color: colors.text }]}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: "#70BC22" }} /></View>;
}
const s = StyleSheet.create({
  content: { gap: 16 }, row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 20 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 1, flex: 1 }, channel: { gap: 6, borderTopWidth: 1, paddingTop: 10 },
  slider: { flex: 1, height: 44, justifyContent: "center", marginRight: 8 }, track: { height: 5, borderRadius: 5, overflow: "hidden" },
  fill: { height: 5, backgroundColor: "#70BC22" }, knob: { position: "absolute", width: 16, height: 16, borderRadius: 8, marginLeft: -8 },
  number: { width: 42, fontSize: 12, fontVariant: ["tabular-nums"] },
});
