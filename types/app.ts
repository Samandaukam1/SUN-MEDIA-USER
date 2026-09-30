import { z } from 'zod';

export const appInterfaceSchema = z.enum(['client', 'employee', 'management']);
export type AppInterface = z.infer<typeof appInterfaceSchema>;

export const myContextSchema = z.object({
  status: z.enum(['active', 'pending', 'disabled']),
  kind: z.enum(['staff', 'client']).nullable().optional(),
  interface: appInterfaceSchema.nullable().optional(),
  profile: z
    .object({
      id: z.string(),
      full_name: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      avatar_url: z.string().nullable(),
      locale: z.string(),
    })
    .optional(),
  roles: z.array(z.object({ key: z.string(), name: z.string() })).default([]),
  employee: z
    .object({ job_title: z.string().nullable(), department: z.string().nullable(), status: z.string() })
    .nullable()
    .optional(),
  permissions: z.array(z.string()).default([]),
  clients: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        code: z.string(),
        logo_url: z.string().nullable(),
        home_logo_url: z.string().nullable().optional(),
        home_logo_dark_url: z.string().nullable().optional(),
        role: z.string(),
        role_name: z.string(),
        permissions: z.array(z.string()),
      }),
    )
    .default([]),
  // An admin-issued password the person has not replaced yet.
  temporary_password: z.boolean().optional().default(false),
  // Centre Home logo (NULL = the built-in SUN MEDIA logo).
  branding: z.object({ home_logo_url: z.string().nullable().optional(), home_logo_dark_url: z.string().nullable().optional() }).optional(),
});

export type MyContext = z.infer<typeof myContextSchema>;
export type ClientMembership = MyContext['clients'][number];
