import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, TextInput, View } from "react-native";
import { GlassSheet, Screen, Text } from "@/components/ui";
import { useMe } from "@/features/auth/AuthProvider";
import { SunCoinIcon, sunCoinWalletKey } from "@/features/sun-coin";
import { useTheme } from "@/hooks/useTheme";
import { leaderboardSchema, lockerKey, lockerSchema, safiRpc, useSafiLocker, type Cosmetic } from "./safiService";

const SLOTS = { gloves: "Qo‘lqop", outfit: "Forma", arena: "Arena", trail: "Tuxum izi", goal_effect: "Gol effekti", nameplate: "Ism bezagi", badge: "Nishon" };
export function SafiLockerScreen() {
  const me = useMe();
  const { colors } = useTheme();
  const cache = useQueryClient();
  const locker = useSafiLocker();
  const [tab, setTab] = useState<"locker" | "daily" | "weekly">("locker");
  const [purchase, setPurchase] = useState<Cosmetic | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [listed, setListed] = useState<boolean | null>(null);
  const requests = useRef(new Map<string, string>());
  const board = useQuery({ queryKey: ["game-center", "board", me.userId, tab], enabled: me.kind === "client" && tab !== "locker", queryFn: async ({ signal }) => leaderboardSchema.parse(await safiRpc("get_safi_leaderboard", { p_period: tab }, signal)), staleTime: 20_000 });
  const action = useMutation({
    mutationFn: async (args: { name: string; params: Record<string, unknown> }) => lockerSchema.parse(await safiRpc(args.name, args.params)),
    onSuccess: (data) => {
      cache.setQueryData(lockerKey(me.userId), data);
      void cache.invalidateQueries({ queryKey: sunCoinWalletKey(me.userId) });
      void cache.invalidateQueries({ queryKey: ["game-center", "board"] });
      setPurchase(null);
    },
  });
  const buy = (item: Cosmetic) => {
    if (action.isPending) return;
    const id = requests.current.get(item.id) ?? randomUUID();
    requests.current.set(item.id, id);
    action.mutate({ name: "purchase_safi_cosmetic", params: { p_item: item.id, p_request: id } });
  };
  const equip = (item: Cosmetic) => action.mutate({ name: "equip_safi_cosmetic", params: { p_item: item.equipped ? null : item.id, p_slot: item.slot } });
  if (me.kind !== "client") return null;
  return <Screen scroll contentStyle={s.page}>
    <Stack.Screen options={{ title: "SAFI Club" }} />
    <Text variant="display">SAFI Club</Text>
    <Text tone="secondary">O‘z uslubingiz. O‘z natijangiz.</Text>
    <View style={s.tabs}>{([['locker','Kolleksiya'],['daily','Bugun'],['weekly','Hafta']] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: tab === key }} onPress={() => setTab(key)} style={[s.tab, { backgroundColor: tab === key ? "#70BC22" : colors.surface }]}><Text variant="captionMedium" style={{ color: tab === key ? "#17230F" : colors.text }}>{label}</Text></Pressable>)}</View>
    {tab === "locker" ? <>
      <View style={s.balance}><SunCoinIcon size={28} /><Text variant="heading">{locker.data?.balance ?? "—"} SC</Text></View>
      {locker.isPending ? <ActivityIndicator color="#70BC22" /> : locker.isError ? <Text tone="secondary" onPress={() => void locker.refetch()}>Kolleksiya ochilmadi. Qayta urinish.</Text> : null}
      {Object.entries(SLOTS).map(([slot, title]) => <View key={slot} style={s.group}><Text variant="heading">{title}</Text><View style={s.grid}>{locker.data?.items.filter((i) => i.slot === slot).map((item) => <View key={item.id} style={[s.item, { backgroundColor: colors.surface, borderColor: item.equipped ? "#70BC22" : colors.border }]}>
        <View style={[s.swatch, { backgroundColor: item.appearance.color ?? (item.appearance.arena === "night" ? "#202D4B" : "#537D31") }]} />
        <Text variant="captionMedium">{item.title}</Text>
        <Text variant="caption" tone="secondary">{item.owned ? item.equipped ? "Tanlangan" : "Sizniki" : item.price ? `${item.price} SC` : "Bepul"}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}: ${item.owned ? item.equipped ? "Yechish" : "Tanlash" : "Olish"}`} disabled={action.isPending} onPress={() => item.owned ? equip(item) : item.price ? setPurchase(item) : buy(item)} style={[s.button, { backgroundColor: colors.surface }]}><Text variant="captionMedium">{item.owned ? item.equipped ? "YECHISH" : "TANLASH" : "OLISH"}</Text></Pressable>
      </View>)}</View></View>)}
      <Text variant="caption" tone="secondary">Bu buyumlar faqat ko‘rinishni o‘zgartiradi. Gol va mukofot imkoniyati barcha o‘yinchilar uchun bir xil qoida bilan aniqlanadi.</Text>
    </> : <>
      <Text variant="caption" tone="secondary">SAFI · {board.data?.dayKey ?? "—"} · tasdiqlangan natijalar</Text>
      {board.isPending ? <ActivityIndicator color="#70BC22" /> : board.isError ? <Text onPress={() => void board.refetch()}>Jadval ochilmadi. Qayta urinish.</Text> : !board.data?.enabled ? <Text tone="secondary">Reyting vaqtincha yopiq.</Text> : !board.data.entries.length ? <Text tone="secondary">Hali reyting natijalari yo‘q. Taxallus bilan qatnashing.</Text> : board.data.entries.map((entry) => <View key={entry.playerId} style={[s.boardRow, { backgroundColor: entry.isMe ? "rgba(112,188,34,.16)" : colors.surface }]}><Text variant="heading">{entry.rank}</Text><View style={{ flex: 1 }}><Text variant="captionMedium">{entry.nickname}{entry.isMe ? " · SIZ" : ""}</Text><Text variant="caption" tone="secondary">{entry.rounds} raund · {entry.goals} gol</Text></View><Text variant="heading">{entry.bestScore}/10</Text></View>)}
      <View style={[s.identity, { backgroundColor: colors.surface }]}>
        <Text variant="heading">Reyting taxallusi</Text>
        <TextInput accessibilityLabel="Reyting taxallusi" placeholder="Masalan: SafiPlayer" placeholderTextColor={colors.textTertiary} maxLength={24} value={nickname ?? locker.data?.identity?.nickname ?? ""} onChangeText={setNickname} autoCapitalize="none" style={[s.input, { color: colors.text, borderColor: colors.border }]} />
        <View style={s.balance}><Text style={{ flex: 1 }}>Reytingda qatnashish</Text><Switch accessibilityLabel="Reytingda qatnashish" value={listed ?? locker.data?.identity?.listed ?? false} onValueChange={setListed} trackColor={{ true: "#70BC22" }} /></View>
        <Text variant="caption" tone="secondary">Faqat taxallusingiz ko‘rsatiladi. Email va telefon ko‘rsatilmaydi. Taxallus: harflar, raqamlar, bo‘sh joy, _ yoki -.</Text>
        <Pressable accessibilityRole="button" disabled={action.isPending} onPress={() => action.mutate({ name: "set_safi_identity", params: { p_nickname: nickname ?? locker.data?.identity?.nickname ?? "", p_listed: listed ?? locker.data?.identity?.listed ?? false } })} style={[s.button, { backgroundColor: "#70BC22" }]}><Text style={{ color: "#17230F", fontWeight: "800" }}>SAQLASH</Text></Pressable>
      </View>
    </>}
    {action.isError ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{(action.error as { message?: string }).message === "COIN_INSUFFICIENT_BALANCE" ? "SUN Coin yetarli emas." : (action.error as { message?: string }).message === "GAME_INVALID_NICKNAME" ? "Taxallusni tekshiring. Email yoki telefon ishlatmang." : "Amal bajarilmadi. Qayta urinib ko‘ring."}</Text> : null}
    <GlassSheet visible={!!purchase} onClose={() => { if (!action.isPending) setPurchase(null); }} title={purchase?.title} eyebrow="SAFI KOLLEKSIYA">
      <Text variant="heading">{purchase?.price ?? 0} SC kerak</Text>
      <Text>Balans: {locker.data?.balance ?? "—"} SC</Text>
      <Text tone="secondary">Xariddan keyin: {Math.max(0, (locker.data?.balance ?? 0) - (purchase?.price ?? 0))} SC</Text>
      <Pressable accessibilityRole="button" disabled={action.isPending || (locker.data?.balance ?? 0) < (purchase?.price ?? 0)} onPress={() => purchase && buy(purchase)} style={[s.button, { backgroundColor: "#70BC22" }]}><Text style={{ color: "#17230F", fontWeight: "800" }}>{action.isPending ? "KUTILMOQDA…" : (locker.data?.balance ?? 0) < (purchase?.price ?? 0) ? "SUN COIN YETARLI EMAS" : "XARID QILISH"}</Text></Pressable>
      {action.isError ? <Text accessibilityRole="alert" tone="secondary">Xarid tasdiqlanmadi. Qayta urinish bir buyum uchun yana Coin sarflamaydi.</Text> : null}
    </GlassSheet>
  </Screen>;
}
const s = StyleSheet.create({
  page: { gap: 18, paddingBottom: 40 }, tabs: { flexDirection: "row", gap: 8 }, tab: { flex: 1, borderRadius: 18, padding: 13, alignItems: "center" },
  balance: { flexDirection: "row", alignItems: "center", gap: 10 }, group: { gap: 12 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  item: { minWidth: 140, flexGrow: 1, borderRadius: 22, borderWidth: 1, padding: 16, gap: 9 }, swatch: { width: 38, height: 38, borderRadius: 19 },
  button: { borderRadius: 14, padding: 13, alignItems: "center" }, boardRow: { flexDirection: "row", alignItems: "center", gap: 16, padding: 17, borderRadius: 20 },
  identity: { padding: 20, borderRadius: 24, gap: 14 }, input: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 16 },
});
