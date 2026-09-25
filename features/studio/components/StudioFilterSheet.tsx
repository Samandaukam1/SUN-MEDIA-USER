import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Button, SegmentedControl, SelectField, Sheet, Text, ToggleRow } from '@/components/ui';
import { CONTENT_TYPE, PLATFORM } from '@/constants/labels';
import { fetchTeamDirectory } from '@/features/team/api';
import { fetchFormOptions, type ContentType, type Platform, type StudioFilters, type StudioSort } from '../api';

type Props = {
  visible: boolean;
  onClose: () => void;
  value: StudioFilters;
  onApply: (next: StudioFilters) => void;
  isStaff: boolean;
};

const SORTS: { value: StudioSort; label: string }[] = [
  { value: 'newest', label: 'Yangi' },
  { value: 'oldest', label: 'Eski' },
  { value: 'deadline', label: 'Muddat' },
  { value: 'priority', label: 'Muhimlik' },
];

export function StudioFilterSheet({ visible, onClose, value, onApply, isStaff }: Props) {
  const [draft, setDraft] = useState<StudioFilters>(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const options = useQuery({ queryKey: ['content', 'form-options', draft.clientId ?? null], queryFn: () => fetchFormOptions(draft.clientId ?? null), enabled: visible });
  const staff = useQuery({ queryKey: ['team', 'directory'], queryFn: fetchTeamDirectory, enabled: visible && isStaff });

  return (
    <Sheet visible={visible} onClose={onClose} title="Filtr va saralash" actionLabel="Qo‘llash" onAction={() => { onApply(draft); onClose(); }}>
      <Text variant="label" tone="tertiary">Saralash</Text>
      <SegmentedControl options={SORTS} value={draft.sort ?? 'newest'} onChange={(sort) => setDraft((d) => ({ ...d, sort }))} />
      {isStaff ? (
        <SelectField
          label="Mijoz"
          value={draft.clientId ?? null}
          allowClear
          placeholder="Barcha mijozlar"
          icon="briefcase"
          options={(options.data?.clients ?? []).map((c) => ({ value: c.id, label: c.name, description: c.code }))}
          onChange={(clientId) => setDraft((d) => ({ ...d, clientId, projectId: null }))}
        />
      ) : null}
      {draft.clientId || !isStaff ? (
        <SelectField
          label="Loyiha"
          value={draft.projectId ?? null}
          allowClear
          placeholder="Barcha loyihalar"
          icon="folder"
          options={(options.data?.projects ?? []).map((p) => ({ value: p.id, label: p.name }))}
          onChange={(projectId) => setDraft((d) => ({ ...d, projectId }))}
        />
      ) : null}
      <SelectField
        label="Kontent turi"
        value={draft.type ?? null}
        allowClear
        placeholder="Barcha turlar"
        icon="film"
        options={Object.entries(CONTENT_TYPE).map(([k, v]) => ({ value: k as ContentType, label: v.label, icon: v.icon }))}
        onChange={(type) => setDraft((d) => ({ ...d, type }))}
      />
      <SelectField
        label="Platforma"
        value={draft.platform ?? null}
        allowClear
        placeholder="Barcha platformalar"
        icon="share-2"
        options={Object.entries(PLATFORM).map(([k, v]) => ({ value: k as Platform, label: v.label, icon: v.icon }))}
        onChange={(platform) => setDraft((d) => ({ ...d, platform }))}
      />
      {isStaff ? (
        <SelectField
          label="Xodim"
          value={draft.employeeId ?? null}
          allowClear
          placeholder="Barcha xodimlar"
          icon="user"
          options={(staff.data ?? []).map((p) => ({ value: p.user_id, label: p.full_name, description: p.job_title, avatar: { name: p.full_name, url: p.avatar_url } }))}
          onChange={(employeeId) => setDraft((d) => ({ ...d, employeeId }))}
        />
      ) : null}
      <ToggleRow label="Faqat muddati o‘tganlar" value={!!draft.overdue} onChange={(overdue) => setDraft((d) => ({ ...d, overdue }))} />
      <Button title="Filtrlarni tozalash" variant="ghost" icon="x" onPress={() => setDraft({ sort: draft.sort })} />
    </Sheet>
  );
}

export function countActiveFilters(f: StudioFilters): number {
  return [f.clientId, f.projectId, f.type, f.platform, f.employeeId, f.overdue].filter(Boolean).length;
}
