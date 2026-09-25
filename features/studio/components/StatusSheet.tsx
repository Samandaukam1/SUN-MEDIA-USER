import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, Icon, Sheet, Text, TextArea, useToast } from '@/components/ui';
import { CONTENT_PIPELINE, CONTENT_STATUS } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { fetchTransitions, setContentStatus, type ContentStatus } from '../api';

/** Moves allowed for the caller come from the database (get_content_transitions). */
export function StatusSheet({ visible, onClose, contentId, current }: { visible: boolean; onClose: () => void; contentId: string; current: ContentStatus }) {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ContentStatus | null>(null);
  const [note, setNote] = useState('');
  const transitions = useQuery({ queryKey: ['content', 'transitions', contentId, current], queryFn: () => fetchTransitions(contentId), enabled: visible });
  const order = (s: ContentStatus) => (s === 'cancelled' ? 99 : s === 'revision' ? CONTENT_PIPELINE.indexOf('editing') + 0.5 : CONTENT_PIPELINE.indexOf(s));
  const options = [...(transitions.data ?? [])].sort((a, b) => order(a) - order(b));

  const mutation = useMutation({
    mutationFn: () => setContentStatus(contentId, selected!, note),
    onSuccess: () => {
      toast.show(`Holat: ${CONTENT_STATUS[selected!].label}`);
      queryClient.invalidateQueries({ queryKey: ['content'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
      setSelected(null);
      setNote('');
      onClose();
    },
    onError: toast.error,
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Holatni o‘zgartirish"
      actionLabel={mutation.isPending ? 'Saqlanmoqda' : 'Saqlash'}
      onAction={() => selected && mutation.mutate()}
      actionDisabled={!selected || mutation.isPending}
    >
      <Text variant="caption" tone="secondary">
        Hozir: {CONTENT_STATUS[current].label}
      </Text>
      {transitions.isSuccess && options.length === 0 ? (
        <EmptyState icon="lock" title="O‘zgartirish mumkin emas" description="Bu bosqichda holatni menejer yoki mas’ul xodim o‘zgartiradi." />
      ) : null}
      <View style={styles.grid}>
        {options.map((s) => {
          const meta = CONTENT_STATUS[s];
          const on = selected === s;
          return (
            <Pressable
              key={s}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setSelected(s)}
              style={[styles.option, { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentSoft : colors.surface }]}
            >
              <Icon name={meta.icon} size={18} color={s === 'cancelled' ? colors.danger : colors.text} />
              <Text variant="captionMedium" numberOfLines={2} style={styles.optionText}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selected ? <TextArea label="Izoh (ixtiyoriy)" value={note} onChangeText={setNote} maxLength={500} minHeight={70} placeholder="Masalan: syomka yakunlandi, 42 ta kadr" /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, minHeight: 56 },
  optionText: { flex: 1 },
});
