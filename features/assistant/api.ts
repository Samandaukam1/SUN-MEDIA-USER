import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase';

/** The admin/site backend that hosts the assistant (Next.js on Vercel). */
export const ASSISTANT_URL = (process.env.EXPO_PUBLIC_ASSISTANT_URL || 'https://sunmedia-admin.vercel.app').replace(/\/$/, '');

export type AssistantAction = { type: 'lead_created' } | { type: 'link'; href: string; label: string } | { type: 'open_apply' };
export type AssistantMsg = { role: 'user' | 'assistant'; text: string; actions?: AssistantAction[]; error?: boolean };

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  return { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
}

/** Sends the conversation; the server answers as this signed-in person (their tasks, shootings, content under RLS). */
export async function askAssistant(messages: AssistantMsg[]): Promise<AssistantMsg> {
  try {
    const res = await fetch(`${ASSISTANT_URL}/api/assistant`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ messages: messages.filter((m) => !m.error).map(({ role, text }) => ({ role, text })) }),
    });
    const data = (await res.json()) as { reply?: string; actions?: AssistantAction[]; error?: string };
    if (res.ok && data.reply) return { role: 'assistant', text: data.reply, actions: data.actions };
    return { role: 'assistant', text: data.error ?? 'Xatolik yuz berdi.', error: true };
  } catch {
    return { role: 'assistant', text: 'Internet bilan bog‘lanib bo‘lmadi. Qayta urinib ko‘ring.', error: true };
  }
}

/** The reply spoken by the neural Uzbek voice: a playable URI, or null when the server has no voice configured. */
export async function speechUri(text: string): Promise<string | null> {
  const clean = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_#`]/g, '').trim().slice(0, 900);
  if (!clean) return null;
  const res = await fetch(`${ASSISTANT_URL}/api/assistant/tts`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ text: clean }) }).catch(() => null);
  if (!res || res.status !== 200) return null;
  if (Platform.OS === 'web') return URL.createObjectURL(await res.blob());
  const { File, Paths } = await import('expo-file-system');
  const ext = (res.headers.get('content-type') ?? '').includes('wav') ? 'wav' : 'mp3';
  const file = new File(Paths.cache, `sunny-${Date.now()}.${ext}`);
  file.create({ overwrite: true });
  file.write(new Uint8Array(await res.arrayBuffer()));
  return file.uri;
}
