import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { DateField, SelectField, Sheet, TextArea, TextField, TimeField, ToggleRow, useToast } from '@/components/ui';
import { COMPANY_EVENT_KIND } from '@/constants/labels';
import { agencyDateKey, agencyDateTimeToIso, addDaysToKey } from '@/lib/time';
import { companyEventInput, createCompanyEvent, type CompanyEventKind } from '../api';

export function CompanyEventForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<CompanyEventKind>('meeting');
  const [date, setDate] = useState<string | null>(agencyDateKey());
  const [start, setStart] = useState<string | null>('10:00');
  const [end, setEnd] = useState<string | null>('11:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: createCompanyEvent,
    onSuccess: () => {
      toast.show('Tadbir qo‘shildi');
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setTitle('');
      setLocation('');
      setDescription('');
      onClose();
    },
    onError: toast.error,
  });

  const submit = () => {
    if (!date) return setErrors({ date: 'Sanani tanlang' });
    const startsAt = allDay ? agencyDateTimeToIso(date, '00:00') : agencyDateTimeToIso(date, start ?? '09:00');
    const endsAt = allDay ? agencyDateTimeToIso(addDaysToKey(date, 1), '00:00') : agencyDateTimeToIso(date, end ?? start ?? '10:00');
    const parsed = companyEventInput.safeParse({
      title,
      kind,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: allDay,
      location: location || null,
      description: description || null,
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Kompaniya tadbiri" actionLabel={mutation.isPending ? 'Saqlanmoqda' : 'Saqlash'} onAction={submit} actionDisabled={mutation.isPending}>
      <TextField label="Nomi" value={title} onChangeText={setTitle} maxLength={160} error={errors.title} placeholder="Masalan: Haftalik reja yig‘ilishi" />
      <SelectField
        label="Turi"
        value={kind}
        onChange={(v) => v && setKind(v)}
        icon="tag"
        options={Object.entries(COMPANY_EVENT_KIND).map(([value, meta]) => ({ value: value as CompanyEventKind, label: meta.label, icon: meta.icon }))}
      />
      <DateField label="Sana" value={date} onChange={setDate} error={errors.date} required />
      <ToggleRow label="Butun kun" description="Bayram, dam olish kuni yoki kun bo‘yi tadbir" value={allDay} onChange={setAllDay} />
      {!allDay ? (
        <>
          <TimeField label="Boshlanishi" value={start} onChange={setStart} />
          <TimeField label="Tugashi" value={end} onChange={setEnd} error={errors.ends_at} />
        </>
      ) : null}
      <TextField label="Joy" value={location} onChangeText={setLocation} maxLength={200} placeholder="Ofis, zal yoki havola" />
      <TextArea label="Izoh" value={description} onChangeText={setDescription} maxLength={2000} minHeight={90} />
    </Sheet>
  );
}
