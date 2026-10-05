import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import type { SessionJournal } from "./gameSession";
const saved = z.object({
  requestId: z.string().uuid(), mode: z.enum(["practice", "free", "paid"]),
  pending: z.object({ sessionId: z.string().uuid(), requestId: z.string().uuid(), attempt: z.number().int().min(1).max(10), selectedZone: z.number().int().min(1).max(15) }).nullable(),
});
/** Only request identifiers are persisted. Score and rewards always come back from the server. */
export function sessionJournal(userId: string): SessionJournal {
  const key = `sunmedia:safi:round:v1:${userId}`;
  return {
    async load() {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      try { return saved.parse(JSON.parse(raw)); } catch { await AsyncStorage.removeItem(key); return null; }
    },
    async save(value) { if (value) await AsyncStorage.setItem(key, JSON.stringify(value)); else await AsyncStorage.removeItem(key); },
  };
}
