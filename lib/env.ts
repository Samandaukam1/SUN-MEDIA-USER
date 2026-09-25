import { z } from 'zod';

// EXPO_PUBLIC_* values are inlined at build time, so each one must be referenced statically.
const schema = z.object({
  supabaseUrl: z.url({ message: 'EXPO_PUBLIC_SUPABASE_URL noto‘g‘ri yoki bo‘sh' }),
  supabaseKey: z.string().min(20, { message: 'Supabase public kaliti topilmadi' }),
});

const parsed = schema.safeParse({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

export const env = parsed.success ? parsed.data : null;
export const envError = parsed.success ? null : parsed.error.issues.map((issue) => issue.message).join('\n');
