import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { SelectField, Sheet, TextArea, TextField, ToggleRow, useToast } from '@/components/ui';
import { DOCUMENT_CATEGORY } from '@/constants/labels';
import { createSharedDocument, documentInput, type DocumentCategory } from '../api';

export function DocumentForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('sop');
  const [url, setUrl] = useState('https://');
  const [description, setDescription] = useState('');
  const [pinned, setPinned] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: createSharedDocument,
    onSuccess: () => {
      toast.show('Hujjat qo‘shildi');
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      setTitle('');
      setUrl('https://');
      setDescription('');
      setPinned(false);
      onClose();
    },
    onError: toast.error,
  });

  const submit = () => {
    const parsed = documentInput.safeParse({ title, category, url, description: description || null, is_pinned: pinned });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Umumiy hujjat" actionLabel={mutation.isPending ? 'Saqlanmoqda' : 'Saqlash'} onAction={submit} actionDisabled={mutation.isPending}>
      <TextField label="Nomi" value={title} onChangeText={setTitle} maxLength={160} error={errors.title} placeholder="Masalan: Reels montaj standarti" />
      <SelectField
        label="Toifa"
        value={category}
        onChange={(v) => v && setCategory(v)}
        icon="folder"
        options={Object.entries(DOCUMENT_CATEGORY).map(([value, meta]) => ({ value: value as DocumentCategory, label: meta.label, icon: meta.icon }))}
      />
      <TextField
        label="Havola"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={errors.url}
        hint="Google Docs, Notion, Figma yoki boshqa https havola"
      />
      <TextArea label="Qisqacha" value={description} onChangeText={setDescription} maxLength={1000} minHeight={80} />
      <ToggleRow label="Muhim (tepada)" value={pinned} onChange={setPinned} />
    </Sheet>
  );
}
