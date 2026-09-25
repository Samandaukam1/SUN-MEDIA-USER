import { z } from 'zod';

/** Shared zod building blocks for RPC payloads (jsonb → typed objects). */
export const zNullableString = z.string().nullable().optional();
export const zNullableNumber = z.number().nullable().optional();
export const zPerson = z.object({ user_id: z.string(), full_name: z.string(), avatar_url: zNullableString });
export type Person = z.infer<typeof zPerson>;

export const zCalendarEvent = z.object({
  event_type: z.string(),
  entity_id: z.string(),
  starts_at: z.string(),
  ends_at: zNullableString,
  title: z.string(),
  content_id: zNullableString,
  content_type: zNullableString,
  platform: zNullableString,
  status: zNullableString,
  location_name: zNullableString,
  client_id: zNullableString,
  client_name: zNullableString,
});
export type CalendarEvent = z.infer<typeof zCalendarEvent>;

export const zNotificationPreview = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: zNullableString,
  created_at: z.string(),
  read_at: zNullableString,
  entity_type: zNullableString,
  entity_id: zNullableString,
});
export type NotificationPreview = z.infer<typeof zNotificationPreview>;
