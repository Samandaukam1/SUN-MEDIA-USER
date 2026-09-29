import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, ChipRow, DateField, QueryView, Screen, SelectField, SkeletonCards, Text, TextArea, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { addDaysToKey, agencyDateKey } from '@/lib/time';
import { useInterfaceBase } from '@/lib/routes';
import { fetchCrmSummary, previewCrmReport, sendCrmReport, type CrmReportKind } from './api';
import { CrmReportView } from './components/CrmReportView';

/**
 * HISOBOT YUBORISH: choose the client and the period (7 / 30 days up to yesterday, or any finished period), see the
 * exact numbers the client will get, then send. The client gets a notification and keeps the report.
 */
export function SendCrmReportScreen() {
  const toast = useToast();
  const base = useInterfaceBase();
  const queryClient = useQueryClient();
  const today = agencyDateKey();
  const summary = useQuery({ queryKey: ['crm', 'summary'], queryFn: fetchCrmSummary });
  const [clientId, setClientId] = useState<string | null>(null);
  const [kind, setKind] = useState<CrmReportKind>('weekly');
  const [customFrom, setCustomFrom] = useState<string | null>(addDaysToKey(today, -14));
  const [customTo, setCustomTo] = useState<string | null>(addDaysToKey(today, -1));
  const [note, setNote] = useState('');

  // Finished days only: a 7-day report ends yesterday, so the client never sees a half day.
  const period =
    kind === 'weekly'
      ? { from: addDaysToKey(today, -7), to: addDaysToKey(today, -1) }
      : kind === 'monthly'
        ? { from: addDaysToKey(today, -30), to: addDaysToKey(today, -1) }
        : customFrom && customTo && customFrom <= customTo && customTo <= today
          ? { from: customFrom, to: customTo }
          : null;

  const preview = useQuery({
    queryKey: ['crm', 'report-preview', clientId, period?.from, period?.to],
    queryFn: () => previewCrmReport(clientId!, period!.from, period!.to),
    enabled: !!clientId && !!period,
  });
  const send = useMutation({
    mutationFn: () => sendCrmReport(clientId!, kind, period!.from, period!.to, note.trim()),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      toast.show('Hisobot mijozga yuborildi', 'success');
      router.replace(`${base}/crm/report/${id}` as never);
    },
    onError: toast.error,
  });

  return (
    <Screen edges={[]} contentStyle={styles.content}>
      <Stack.Screen options={{ title: 'Hisobot yuborish' }} />
      <QueryView query={summary} skeleton={<SkeletonCards count={1} />}>
        {(s) => (
          <SelectField
            label="Mijoz"
            icon="briefcase"
            searchable
            options={s.clients.map((c) => ({ value: c.id, label: c.name, description: `${c.pending} ta yuborilmagan` }))}
            value={clientId}
            onChange={setClientId}
          />
        )}
      </QueryView>

      <View style={styles.group}>
        <Text variant="label" tone="tertiary">
          Davr
        </Text>
        <ChipRow>
          <Chip label="7 kunlik" selected={kind === 'weekly'} onPress={() => setKind('weekly')} />
          <Chip label="30 kunlik" selected={kind === 'monthly'} onPress={() => setKind('monthly')} />
          <Chip label="Maxsus muddat" selected={kind === 'custom'} onPress={() => setKind('custom')} />
        </ChipRow>
        {kind === 'custom' ? (
          <View style={styles.row}>
            <View style={styles.flex}>
              <DateField label="Boshlanishi" value={customFrom} onChange={setCustomFrom} />
            </View>
            <View style={styles.flex}>
              <DateField label="Tugashi" value={customTo} onChange={setCustomTo} error={customTo && customTo > today ? 'Kelajak sanasi bo‘lmaydi' : null} />
            </View>
          </View>
        ) : null}
      </View>

      {clientId && period ? (
        <QueryView query={preview} skeleton={<SkeletonCards count={2} />}>
          {(data) => <CrmReportView data={data} />}
        </QueryView>
      ) : (
        <Text variant="caption" tone="tertiary">
          Mijoz va davrni tanlang — hisobot shu yerda oldindan ko‘rinadi.
        </Text>
      )}

      <TextArea label="Izoh (ixtiyoriy)" value={note} onChangeText={setNote} minHeight={80} maxLength={1000} placeholder="Masalan: yangi kampaniya 3-kundan boshlandi" />
      <Button title="Mijozga yuborish" icon="send" disabled={!clientId || !period || !preview.data} loading={send.isPending} onPress={() => send.mutate()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
