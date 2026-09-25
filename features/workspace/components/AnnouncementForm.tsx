import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Sheet, TextArea, TextField, ToggleRow, useToast, SelectField } from '@/components/ui';
import { ROLE_LABEL } from '@/constants/labels';
import { announcementInput, createAnnouncement } from '../api';

const STAFF_ROLES = ['director', 'admin', 'project_manager', 'smm_manager', 'operator', 'editor', 'designer', 'copywriter'] as const;

/** Post an announcement to all staff or selected roles (workspace.manage; enforced by RLS). */
export function AnnouncementForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      toast.show('E’lon yuborildi');
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
      setTitle('');
      setBody('');
      setPinned(false);
      setRoles([]);
      onClose();
    },
    onError: toast.error,
  });

  const submit = () => {
    const parsed = announcementInput.safeParse({ title, body, is_pinned: pinned, audience_roles: roles.length ? roles : null });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Yangi e’lon" actionLabel={mutation.isPending ? 'Yuborilmoqda' : 'Yuborish'} onAction={submit} actionDisabled={mutation.isPending}>
      <TextField label="Sarlavha" value={title} onChangeText={setTitle} maxLength={160} error={errors.title} placeholder="Masalan: Ertaga umumiy yig‘ilish" />
      <TextArea label="Matn" value={body} onChangeText={setBody} maxLength={4000} error={errors.body} required placeholder="Jamoaga nima demoqchisiz?" />
      <SelectField
        label="Kimlar uchun"
        multiple
        value={roles}
        onChange={setRoles}
        placeholder="Barcha xodimlar"
        icon="users"
        options={STAFF_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] ?? r }))}
      />
      <ToggleRow label="Tepaga mahkamlash" description="Mahkamlangan e’lon ro‘yxat boshida turadi va muhim deb yuboriladi." value={pinned} onChange={setPinned} />
    </Sheet>
  );
}
