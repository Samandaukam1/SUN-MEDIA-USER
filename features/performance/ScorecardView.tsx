import { StyleSheet, View } from 'react-native';

import { Card, Counters, ProgressBar, Section, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { attendanceRate, formatMinutes, type Scorecard } from './api';

function Rate({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  return (
    <View style={styles.rate}>
      <View style={styles.rateHead}>
        <Text variant="captionMedium" style={styles.flex}>
          {label}
        </Text>
        <Text variant="captionMedium" style={styles.num}>
          {value == null ? '—' : `${value}%`}
        </Text>
      </View>
      <ProgressBar value={(value ?? 0) / 100} tone={value == null ? 'accent' : value >= 85 ? 'success' : value >= 60 ? 'warning' : 'danger'} label={label} />
      {hint ? (
        <Text variant="micro" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** One employee's KPI for a period: tasks, attendance, shootings and role-specific results. */
export function ScorecardView({ card }: { card: Scorecard }) {
  const m = card.metrics;
  const att = attendanceRate(m);
  const isOperator = card.role_keys.includes('operator');
  return (
    <>
      <Section title="Vazifalar">
        <Card style={styles.gap}>
          <Counters
            items={[
              { label: 'Berilgan', value: m.assigned_tasks },
              { label: 'Bajarildi', value: m.completed_tasks, tone: 'success' },
              { label: 'O‘z vaqtida', value: m.completed_on_time },
              { label: 'Overdue', value: m.overdue_tasks, tone: m.overdue_tasks ? 'danger' : 'primary' },
            ]}
          />
          <Rate label="O‘z vaqtida bajarish" value={m.on_time_rate} hint={`O‘rtacha bajarish vaqti: ${formatMinutes(m.avg_completion_minutes)} · yuklama ${formatMinutes(m.workload_minutes)}`} />
        </Card>
      </Section>

      <Section title="Davomat">
        <Card style={styles.gap}>
          <Counters
            items={[
              { label: 'Keldi', value: m.present_days, tone: 'success' },
              { label: 'Kechikdi', value: m.late_days, tone: m.late_days ? 'warning' : 'primary' },
              { label: 'Kelmadi', value: m.absent_days, tone: m.absent_days ? 'danger' : 'primary' },
              { label: 'Sababli / ta’til', value: m.excused_days + m.vacation_days },
            ]}
          />
          <Rate label="Davomat darajasi" value={att} hint={m.late_minutes ? `Jami kechikish: ${formatMinutes(m.late_minutes)}` : undefined} />
        </Card>
      </Section>

      {m.shootings_assigned || isOperator ? (
        <Section title="Syomkalar">
          <Card style={styles.gap}>
            <Counters
              items={[
                { label: 'Biriktirilgan', value: m.shootings_assigned },
                { label: 'Yakunlangan', value: m.shootings_completed },
                { label: 'Kechikdi', value: m.shootings_late, tone: m.shootings_late ? 'warning' : 'primary' },
                { label: 'Kelmadi', value: m.shootings_absent, tone: m.shootings_absent ? 'danger' : 'primary' },
              ]}
            />
            <Rate
              label="Syomkaga o‘z vaqtida kelish"
              value={m.shootings_arrived + m.shootings_late ? Math.round((100 * m.shootings_arrived) / (m.shootings_arrived + m.shootings_late + m.shootings_absent)) : null}
            />
          </Card>
        </Section>
      ) : null}

      {m.editor ? (
        <Section title="Montaj KPI">
          <Card style={styles.gap}>
            <Counters
              items={[
                { label: 'Montaj qilingan', value: m.editor.videos_edited },
                { label: 'Yuborilgan', value: m.editor.contents_submitted },
                { label: 'Revision', value: m.editor.revisions, tone: m.editor.revisions ? 'warning' : 'primary' },
              ]}
            />
            <Rate label="Birinchi urinishda tasdiqlangan" value={m.approval_rate} />
            <Rate label="Montajni o‘z vaqtida topshirish" value={m.editor.on_time_rate} hint={`O‘rtacha montaj vaqti: ${formatMinutes(m.editor.avg_editing_minutes)}`} />
          </Card>
        </Section>
      ) : null}

      {m.smm ? (
        <Section title="SMM KPI">
          <Card style={styles.gap}>
            <Counters
              items={[
                { label: 'Joylangan', value: m.smm.published, tone: 'success' },
                { label: 'Kechikkan nashr', value: m.smm.delayed_publications, tone: m.smm.delayed_publications ? 'danger' : 'primary' },
                { label: 'Rejada', value: m.smm.calendar_planned },
              ]}
            />
            <Rate label="Kontent reja bajarilishi" value={m.smm.calendar_completion_rate} />
          </Card>
        </Section>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.lg },
  rate: { gap: 6 },
  rateHead: { flexDirection: 'row', alignItems: 'baseline' },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
});
