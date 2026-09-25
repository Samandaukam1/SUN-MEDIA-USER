import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';

const HOME = { client: '/client', employee: '/staff', management: '/manage' } as const;

/** Single entry point: sends every user to the interface their role requires. */
export default function Index() {
  const { status, appInterface } = useAuth();
  if (status === 'loading') return null;
  if (status === 'signed_out') return <Redirect href="/sign-in" />;
  if (status !== 'ready' || !appInterface) return <Redirect href="/pending" />;
  return <Redirect href={HOME[appInterface]} />;
}
