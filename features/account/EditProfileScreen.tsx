import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, QueryView, Screen, TextField, useToast } from '@/components/ui';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useNav } from '@/lib/routes';
import { fetchOwnProfile, profileInput, updateOwnProfile } from './api';

export function EditProfileScreen() {
  const me = useMe();
  const { refreshContext } = useAuth();
  const nav = useNav();
  const toast = useToast();
  const query = useQuery({ queryKey: ['me', 'profile', me.userId], queryFn: () => fetchOwnProfile(me.userId) });
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!query.data) return;
    setFirst(query.data.first_name ?? query.data.full_name.split(' ')[0] ?? '');
    setLast(query.data.last_name ?? query.data.full_name.split(' ').slice(1).join(' '));
    setPhone(query.data.phone ?? '');
  }, [query.data]);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = profileInput.safeParse({ first_name: first, last_name: last, phone });
      if (!parsed.success) {
        setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
        return false;
      }
      setErrors({});
      await updateOwnProfile(me.userId, parsed.data);
      await refreshContext();
      return true;
    },
    onSuccess: (ok) => {
      if (!ok) return;
      toast.show('Profil saqlandi');
      nav.back();
    },
    onError: toast.error,
  });

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Profil' }} />
      <QueryView query={query}>
        {(p) => (
          <>
            <TextField label="Ism" value={first} onChangeText={setFirst} error={errors.first_name} autoComplete="given-name" textContentType="givenName" />
            <TextField label="Familiya" value={last} onChangeText={setLast} error={errors.last_name} autoComplete="family-name" textContentType="familyName" />
            <TextField
              label="Telefon"
              value={phone}
              onChangeText={setPhone}
              error={errors.phone}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              placeholder="+998 90 123 45 67"
            />
            <TextField label="Email (login)" value={p.email ?? ''} editable={false} hint="Loginni faqat administrator o‘zgartiradi." />
            <Button title="Saqlash" loading={save.isPending} onPress={() => save.mutate()} />
          </>
        )}
      </QueryView>
    </Screen>
  );
}
