import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Chip, ChipRow, EmptyState, Icon, ItemRow, ProgressBar, QueryView, Screen, Section, Sheet, Text, TextArea, useToast } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { formatAgo, formatDateKey } from '@/lib/time';
import { cancelUpgrade, fetchClientPlan, formatMoney, requestUpgrade, type ClientPlan } from './api';

const STATUS_LABEL = { scheduled: 'Rejalashtirilgan', active: 'Faol', expired: 'Tugagan', cancelled: 'Bekor qilingan' } as const;

/** Client "Mening tarifim": what is included and how much is left; changing the plan is one button away. */
export function PlanScreen() {
  const me = useMe();
  const [clientId, setClientId] = useState(me.clients[0]?.id ?? null);
  const query = useQuery({ queryKey: ['plan', 'client', clientId], queryFn: () => fetchClientPlan(clientId!), enabled: !!clientId });

  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen options={{ title: 'Mening tarifim' }} />
      {me.clients.length > 1 ? (
        <ChipRow>
          {me.clients.map((c) => (
            <Chip key={c.id} label={c.name} selected={c.id === clientId} onPress={() => setClientId(c.id)} />
          ))}
        </ChipRow>
      ) : null}
      {clientId ? (
        <QueryView query={query}>{(plan) => <PlanBody clientId={clientId} plan={plan} />}</QueryView>
      ) : (
        <EmptyState icon="credit-card" title="Kompaniya topilmadi" />
      )}
    </Screen>
  );
}

function PlanBody({ clientId, plan }: { clientId: string; plan: ClientPlan }) {
  const { can } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [changing, setChanging] = useState(false);
  const current = plan.current;
  const canRequest = can('client.plan.request_upgrade');
  const refresh = () => ['plan', 'home'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));

  const cancel = useMutation({
    mutationFn: () => cancelUpgrade(plan.pending_request!.id),
    onSuccess: () => {
      toast.show('So‘rov bekor qilindi');
      refresh();
    },
    onError: toast.error,
  });

  const quantitative = plan.usage.filter((u) => u.is_quantitative && u.is_included);
  const services = plan.usage.filter((u) => !u.is_quantitative && u.is_included);
  const elapsed = current ? Math.max(0, current.days_total - current.days_left) / Math.max(1, current.days_total) : 0;

  return (
    <>
      <Card variant="hero" style={styles.hero}>
        <Text variant="label" tone="heroSecondary">
          Joriy tarif
        </Text>
        <Text variant="display" tone="hero">
          {current ? current.plan.name : 'Tarif yo‘q'}
        </Text>
        {current ? (
          <>
            <Text variant="caption" tone="heroSecondary">
              {`${formatDateKey(current.starts_on)} — ${formatDateKey(current.ends_on, true)} · ${formatMoney(current.price, current.currency)}`}
            </Text>
            <View style={styles.period}>
              <ProgressBar value={elapsed} tone="brand" height={6} label="Davr o‘tishi" />
              <Text variant="caption" tone="heroSecondary">
                {current.status === 'scheduled' ? 'Hali boshlanmagan' : `${current.days_left} kun qoldi`}
              </Text>
            </View>
          </>
        ) : (
          <Text variant="caption" tone="heroSecondary">
            Menejeringiz tarif biriktirgach, bu yerda foydalanish ko‘rinadi.
          </Text>
        )}
      </Card>

      {plan.upcoming ? (
        <Card style={[styles.notice, { borderColor: colors.info }]}>
          <View style={styles.row}>
            <Icon name="calendar" size={18} color={colors.info} />
            <Text variant="subheading" style={styles.flex}>
              {`${formatDateKey(plan.upcoming.starts_on)}dan: ${plan.upcoming.plan_name}`}
            </Text>
          </View>
          <Text variant="caption" tone="secondary">
            {`${formatDateKey(plan.upcoming.starts_on)} — ${formatDateKey(plan.upcoming.ends_on, true)} · ${formatMoney(plan.upcoming.price, plan.upcoming.currency)}`}
          </Text>
        </Card>
      ) : null}

      {plan.pending_request ? (
        <Card style={[styles.notice, { borderColor: colors.warning }]}>
          <View style={styles.row}>
            <Icon name="clock" size={18} color={colors.warning} />
            <Text variant="subheading" style={styles.flex}>
              {`So‘rov yuborilgan: ${plan.pending_request.plan_name}`}
            </Text>
          </View>
          <Text variant="caption" tone="secondary">
            {`${formatAgo(plan.pending_request.created_at)} · menejer ko‘rib chiqmoqda`}
          </Text>
          {canRequest ? (
            <Button
              title="So‘rovni bekor qilish"
              variant="ghost"
              size="md"
              fullWidth={false}
              loading={cancel.isPending}
              onPress={() =>
                Alert.alert('So‘rovni bekor qilasizmi?', undefined, [
                  { text: 'Yo‘q', style: 'cancel' },
                  { text: 'Bekor qilish', style: 'destructive', onPress: () => cancel.mutate() },
                ])
              }
            />
          ) : null}
        </Card>
      ) : plan.last_decision && !(plan.last_decision.status === 'approved' && plan.upcoming?.plan_name === plan.last_decision.plan_name) ? (
        <Card style={[styles.notice, { borderColor: plan.last_decision.status === 'approved' ? colors.success : colors.danger }]}>
          <View style={styles.row}>
            <Icon name={plan.last_decision.status === 'approved' ? 'check-circle' : 'x-circle'} size={18} color={plan.last_decision.status === 'approved' ? colors.success : colors.danger} />
            <Text variant="subheading" style={styles.flex}>
              {plan.last_decision.status === 'approved' ? `${plan.last_decision.plan_name} tasdiqlandi` : `${plan.last_decision.plan_name} so‘rovi rad etildi`}
            </Text>
          </View>
          {plan.last_decision.response ? (
            <Text variant="body" tone="secondary">
              {plan.last_decision.response}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {current ? (
        <Section title="Bu davrda">
          <Card style={styles.usage}>
            {quantitative.map((u) => {
              const planned = u.planned ?? 0;
              const left = planned - u.used;
              return (
                <View key={u.service_key} style={styles.usageRow}>
                  <View style={styles.row}>
                    <Text variant="bodyMedium" style={styles.flex}>
                      {u.service_name}
                    </Text>
                    <Text variant="bodyMedium" style={styles.num}>
                      {u.used}
                      <Text variant="caption" tone="tertiary">{` / ${u.planned ?? '∞'} ${u.unit}`}</Text>
                    </Text>
                  </View>
                  <ProgressBar value={planned ? u.used / planned : 0} tone={left < 0 ? 'success' : 'accent'} label={`${u.service_name}: ${u.used} / ${planned}`} />
                  <Text variant="caption" tone={left < 0 ? 'success' : 'tertiary'}>
                    {planned === 0 ? 'Miqdor belgilanmagan' : left > 0 ? `${left} ${u.unit} qoldi` : left === 0 ? 'Reja to‘liq bajarildi' : `Rejadan +${-left} ko‘p bajarildi`}
                  </Text>
                </View>
              );
            })}
            {quantitative.length === 0 ? (
              <Text variant="caption" tone="tertiary">
                Bu tarifda miqdoriy xizmat yo‘q.
              </Text>
            ) : null}
          </Card>
          {services.length ? (
            <View style={styles.services}>
              {services.map((s) => (
                <Badge key={s.service_key} label={s.service_name} icon="check" tone="success" />
              ))}
            </View>
          ) : null}
        </Section>
      ) : null}

      {canRequest && !plan.pending_request ? (
        <Button title="Tarifni o‘zgartirish" icon="repeat" variant="secondary" onPress={() => setChanging(true)} />
      ) : null}

      {plan.history.length ? (
        <Section title="Oldingi davrlar">
          <Card padded={false}>
            {plan.history.map((h, i) => (
              <ItemRow
                key={h.id}
                first={i === 0}
                icon="calendar"
                title={h.plan_name}
                subtitle={`${formatDateKey(h.starts_on)} — ${formatDateKey(h.ends_on, true)}`}
                right={<Badge label={STATUS_LABEL[h.status]} />}
              />
            ))}
          </Card>
        </Section>
      ) : null}

      <ChangePlanSheet clientId={clientId} plans={plan.plans} visible={changing} onClose={() => setChanging(false)} onSent={refresh} />
    </>
  );
}

/** Step 1: pick a plan from the catalogue. Step 2: an optional note, then the request goes to the manager. */
function ChangePlanSheet({ clientId, plans, visible, onClose, onSent }: { clientId: string; plans: ClientPlan['plans']; visible: boolean; onClose: () => void; onSent: () => void }) {
  const toast = useToast();
  const { colors } = useTheme();
  const [target, setTarget] = useState<ClientPlan['plans'][number] | null>(null);
  const [message, setMessage] = useState('');
  const close = () => {
    setTarget(null);
    onClose();
  };
  const send = useMutation({
    mutationFn: () => requestUpgrade(clientId, target!.id, message),
    onSuccess: () => {
      toast.show('So‘rov yuborildi. Menejer tez orada javob beradi.');
      setMessage('');
      onSent();
      close();
    },
    onError: toast.error,
  });
  const price = (p: ClientPlan['plans'][number]) => `${formatMoney(p.price, p.currency)} · ${p.duration_months === 1 ? 'oyiga' : `${p.duration_months} oyga`}`;

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={target ? target.name : 'Tarifni tanlang'}
      actionLabel={target ? 'Yuborish' : undefined}
      actionDisabled={send.isPending}
      onAction={target ? () => send.mutate() : undefined}
    >
      {target ? (
        <>
          <Card style={styles.planCard}>
            <Text variant="heading">{target.name}</Text>
            <Text variant="caption" tone="secondary">
              {price(target)}
            </Text>
          </Card>
          <TextArea label="Izoh (ixtiyoriy)" value={message} onChangeText={setMessage} maxLength={2000} minHeight={100} placeholder="Masalan: keyingi oydan ko‘proq reels kerak" />
          <Text variant="caption" tone="tertiary">
            So‘rov menejerga boradi. Tasdiqlansa, yangi tarif belgilangan sanadan ishga tushadi va sizga xabar keladi.
          </Text>
          <Button title="So‘rov yuborish" icon="send" loading={send.isPending} onPress={() => send.mutate()} />
          <Button title="Boshqa tarif tanlash" variant="ghost" size="md" onPress={() => setTarget(null)} />
        </>
      ) : (
        plans.map((p) => (
          <Card key={p.id} style={[styles.planCard, p.is_current && { borderColor: colors.accent, borderWidth: 1.5 }]}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="heading">{p.name}</Text>
                <Text variant="caption" tone="secondary">
                  {price(p)}
                </Text>
              </View>
              {p.is_current ? <Badge label="Hozirgi" tone="accent" /> : p.is_custom ? <Badge label="Siz uchun" tone="violet" /> : null}
            </View>
            <View style={styles.features}>
              {p.features.map((f, i) => (
                <View key={i} style={styles.row}>
                  <Icon name="check" size={14} color={colors.success} />
                  <Text variant="caption" style={styles.flex}>
                    {f.quantity == null ? f.service_name : `${f.service_name}: ${f.quantity} ${f.unit}`}
                  </Text>
                </View>
              ))}
            </View>
            {!p.is_current ? <Button title="Shu tarifni tanlash" variant="secondary" size="md" onPress={() => setTarget(p)} /> : null}
          </Card>
        ))
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hero: { gap: spacing.sm },
  period: { gap: spacing.xs, marginTop: spacing.sm },
  notice: { gap: spacing.sm, borderWidth: 1 },
  usage: { gap: spacing.lg },
  usageRow: { gap: 6 },
  num: { fontVariant: ['tabular-nums'] },
  services: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  planCard: { gap: spacing.sm, borderRadius: radius.lg },
  features: { gap: 4 },
});
