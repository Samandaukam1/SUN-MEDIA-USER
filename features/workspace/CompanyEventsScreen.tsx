import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Card, HeaderButton, Icon, QueryView, Screen, Section, Text, EmptyState, useToast } from '@/components/ui';
import { COMPANY_EVENT_KIND } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { addDaysToKey, agencyDateKey, agencyDayRange, formatDateKeyLong, formatTime } from '@/lib/time';
import { cancelCompanyEvent, fetchCompanyEvents, type CompanyEvent } from './api';
import { CompanyEventForm } from './components/CompanyEventForm';

/** Upcoming meetings, holidays, days off and company events (next 60 days), grouped by day. */
export function CompanyEventsScreen() {
  const { can } = useAuth();
  const [creating, setCreating] = useState(false);
  const today = agencyDateKey();
  const range = useMemo(() => ({ from: agencyDayRange(today).from, to: agencyDayRange(addDaysToKey(today, 60)).to }), [today]);
  const query = useQuery({ queryKey: ['workspace', 'events', range.from], queryFn: () => fetchCompanyEvents(range.from, range.to) });

  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen
        options={{
          title: 'Kompaniya tadbirlari',
          headerRight: can('workspace.manage') ? () => <HeaderButton icon="plus" label="Yangi tadbir" onPress={() => setCreating(true)} /> : undefined,
        }}
      />
      <QueryView
        query={query}
        isEmpty={(d) => d.length === 0}
        empty={{ icon: 'calendar', title: 'Yaqin 60 kunda tadbir yo‘q', description: 'Yig‘ilishlar, bayramlar va dam olish kunlari shu yerda ko‘rinadi.' }}
      >
        {(events) => <Grouped events={events} canManage={can('workspace.manage')} />}
      </QueryView>
      <CompanyEventForm visible={creating} onClose={() => setCreating(false)} />
    </Screen>
  );
}

function Grouped({ events, canManage }: { events: CompanyEvent[]; canManage: boolean }) {
  const groups = new Map<string, CompanyEvent[]>();
  events.forEach((e) => {
    const key = agencyDateKey(e.starts_at);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  });
  if (groups.size === 0) return <EmptyState icon="calendar" title="Tadbir yo‘q" />;
  return (
    <>
      {[...groups.entries()].map(([day, list]) => (
        <Section key={day} title={formatDateKeyLong(day)}>
          {list.map((e) => (
            <CompanyEventCard key={e.id} event={e} canManage={canManage} />
          ))}
        </Section>
      ))}
    </>
  );
}

export function CompanyEventCard({ event, canManage = false }: { event: CompanyEvent; canManage?: boolean }) {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const meta = COMPANY_EVENT_KIND[event.kind as keyof typeof COMPANY_EVENT_KIND] ?? COMPANY_EVENT_KIND.company_event;
  const cancel = useMutation({
    mutationFn: () => cancelCompanyEvent(event.id),
    onSuccess: () => {
      toast.show('Tadbir bekor qilindi');
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
    },
    onError: toast.error,
  });
  return (
    <Card
      onLongPress={
        canManage
          ? () =>
              Alert.alert(event.title, 'Tadbirni bekor qilasizmi?', [
                { text: 'Yo‘q', style: 'cancel' },
                { text: 'Bekor qilish', style: 'destructive', onPress: () => cancel.mutate() },
              ])
          : undefined
      }
      accessibilityHint={canManage ? 'Bekor qilish uchun bosib turing' : undefined}
    >
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.surfaceSunken }]}>
          <Icon name={meta.icon} size={18} color={colors.text} />
        </View>
        <View style={styles.body}>
          <Text variant="micro" tone="tertiary">
            {meta.label.toUpperCase()} · {event.all_day ? 'Butun kun' : `${formatTime(event.starts_at)}–${formatTime(event.ends_at)}`}
          </Text>
          <Text variant="subheading">{event.title}</Text>
          {event.location ? (
            <Text variant="caption" tone="secondary">
              {event.location}
            </Text>
          ) : null}
          {event.description ? (
            <Text variant="caption" tone="secondary" numberOfLines={3}>
              {event.description}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
});
