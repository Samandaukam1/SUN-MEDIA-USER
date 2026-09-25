import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, Screen, Section, SkeletonCards, Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { agencyDateKey, formatDateKeyLong } from '@/lib/time';
import { fetchClientToday } from './api';
import { ContentRow } from './components/ContentRow';
import { TodayPlanCard } from './components/TodayPlanCard';

export function ClientHome() {
  const me = useMe();
  const [clientId, setClientId] = useState(me.clients[0]?.id);
  const client = me.clients.find((c) => c.id === clientId) ?? me.clients[0];
  const today = agencyDateKey();

  const query = useQuery({
    queryKey: ['home', 'client', client?.id, today],
    queryFn: () => fetchClientToday(client!.id, today),
    enabled: !!client,
  });

  const { plan, others } = useMemo(() => {
    const data = query.data;
    if (!data) return { plan: [], others: [] };
    const byShooting = new Map<string, typeof data.contents>();
    data.contents.forEach((c) => {
      if (!c.shooting_id) return;
      byShooting.set(c.shooting_id, [...(byShooting.get(c.shooting_id) ?? []), c]);
    });
    const planned = data.shootings.map((s) => ({ shooting: s, contents: byShooting.get(s.id) ?? [] }));
    const shootingIds = new Set(data.shootings.map((s) => s.id));
    return { plan: planned, others: data.contents.filter((c) => !c.shooting_id || !shootingIds.has(c.shooting_id)) };
  }, [query.data]);

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <View style={styles.greeting}>
        <Text variant="caption" tone="tertiary">
          {formatDateKeyLong(today)}
        </Text>
        <Text variant="display">Assalomu alaykum, {client?.name ?? me.profile?.full_name}</Text>
      </View>

      {me.clients.length > 1 ? <ClientSwitcher value={client?.id} onChange={setClientId} /> : null}

      {query.isPending ? (
        <SkeletonCards count={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <Section title="Bugungi reja">
            {plan.length === 0 ? (
              <EmptyState icon="sun" title="Bugun syomka yo‘q" description="Rejalashtirilgan syomkalar shu yerda paydo bo‘ladi." />
            ) : (
              plan.map(({ shooting, contents }) => <TodayPlanCard key={shooting.id} shooting={shooting} contents={contents} />)
            )}
          </Section>
          {others.length > 0 ? (
            <Section title="Bugungi kontentlar">
              {others.map((content) => (
                <ContentRow key={content.id} content={content} />
              ))}
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function ClientSwitcher({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const me = useMe();
  const { colors } = useTheme();
  return (
    <View style={styles.switcher}>
      {me.clients.map((c) => {
        const active = c.id === value;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(c.id)}
            style={[styles.chip, { backgroundColor: active ? colors.accentSoft : colors.surface, borderColor: active ? colors.accent : colors.border }]}
          >
            <Text variant="captionMedium" tone={active ? 'accent' : 'secondary'}>
              {c.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: spacing.xs },
  switcher: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
});
