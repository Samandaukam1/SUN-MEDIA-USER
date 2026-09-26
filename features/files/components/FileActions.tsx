import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { ActionSheetIOS, Alert, Platform, Share } from 'react-native';

import { Button, OptionSheet, Sheet, TextField, useToast } from '@/components/ui';
import { FOLDER_KIND } from '@/constants/labels';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { signedUrl } from '@/lib/storage';
import { fetchClientFolders, moveFile, removeFile, renameFile, setFileVisibility, type Visibility } from '../api';

export type ActionFile = {
  id: string;
  name: string;
  client_id: string | null;
  folder_id: string | null;
  task_id: string | null;
  visibility: Visibility;
  uploaded_by: string | null;
  bucket: string | null;
  storage_path: string | null;
  external_url: string | null;
};

type Action = { label: string; destructive?: boolean; run: () => void };

/** One place for what can be done with a file; the database re-checks every permission. */
export function useFileActions(onRemoved?: () => void): { open: (file: ActionFile) => void; element: ReactNode } {
  const { can, appInterface } = useAuth();
  const me = useMe();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<ActionFile | null>(null);
  const [mode, setMode] = useState<'rename' | 'move' | null>(null);
  const [name, setName] = useState('');
  const isStaff = appInterface !== 'client';
  const canManage = isStaff && can('files.manage');

  const folders = useQuery({
    queryKey: ['files', 'folders', target?.client_id],
    queryFn: () => fetchClientFolders(target!.client_id!),
    enabled: mode === 'move' && !!target?.client_id,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['files'] });
  const done = (message: string) => {
    toast.show(message);
    refresh();
    setMode(null);
  };

  const rename = useMutation({ mutationFn: () => renameFile(target!.id, name), onSuccess: () => done('Nomi o‘zgartirildi'), onError: toast.error });
  const move = useMutation({ mutationFn: (folderId: string) => moveFile(target!.id, folderId), onSuccess: () => done('Fayl ko‘chirildi'), onError: toast.error });
  const visibility = useMutation({
    mutationFn: (v: Visibility) => setFileVisibility(target!.id, v),
    onSuccess: (_, v) => done(v === 'client' ? 'Endi mijoz ko‘radi' : 'Mijozdan yashirildi'),
    onError: toast.error,
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeFile(id),
    onSuccess: () => {
      done('Fayl o‘chirildi');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['content'] });
      onRemoved?.();
    },
    onError: toast.error,
  });

  const openFile = async (file: ActionFile) => {
    try {
      const url = await signedUrl(file);
      if (url) await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      toast.error(e);
    }
  };

  const shareFile = async (file: ActionFile) => {
    try {
      const url = await signedUrl(file);
      if (!url) return;
      // Storage links are temporary: they stop working after an hour.
      await Share.share(Platform.OS === 'ios' ? { url, message: file.name } : { message: `${file.name}\n${url}` });
    } catch (e) {
      toast.error(e);
    }
  };

  const open = (file: ActionFile) => {
    setTarget(file);
    const actions: Action[] = [
      { label: 'Ochish', run: () => openFile(file) },
      { label: 'Ulashish (1 soatlik havola)', run: () => shareFile(file) },
    ];
    if (canManage) {
      actions.push({
        label: 'Nomini o‘zgartirish',
        run: () => {
          setName(file.name);
          setMode('rename');
        },
      });
      if (file.client_id && !file.task_id) {
        actions.push({ label: 'Boshqa papkaga ko‘chirish', run: () => setMode('move') });
        actions.push(
          file.visibility === 'client'
            ? { label: 'Mijozdan yashirish', run: () => visibility.mutate('internal') }
            : { label: 'Mijozga ko‘rsatish', run: () => visibility.mutate('client') },
        );
      }
    }
    if (canManage || file.uploaded_by === me.userId || (isStaff && can('tasks.manage') && file.task_id)) {
      actions.push({
        label: 'O‘chirish',
        destructive: true,
        run: () =>
          Alert.alert('Faylni o‘chirasizmi?', `“${file.name}” ro‘yxatdan olib tashlanadi. Tarixda saqlanib qoladi.`, [
            { text: 'Bekor qilish', style: 'cancel' },
            { text: 'O‘chirish', style: 'destructive', onPress: () => remove.mutate(file.id) },
          ]),
      });
    }

    if (Platform.OS === 'ios') {
      const labels = [...actions.map((a) => a.label), 'Bekor qilish'];
      ActionSheetIOS.showActionSheetWithOptions(
        { title: file.name, options: labels, cancelButtonIndex: labels.length - 1, destructiveButtonIndex: actions.findIndex((a) => a.destructive) },
        (index) => actions[index]?.run(),
      );
    } else {
      Alert.alert(file.name, undefined, [...actions.slice(0, 2).map((a) => ({ text: a.label, onPress: a.run })), { text: 'Bekor qilish', style: 'cancel' }]);
    }
  };

  const element = (
    <>
      <Sheet
        visible={mode === 'rename'}
        onClose={() => setMode(null)}
        title="Nomini o‘zgartirish"
        actionLabel="Saqlash"
        actionDisabled={!name.trim() || rename.isPending}
        onAction={() => rename.mutate()}
      >
        <TextField label="Fayl nomi" value={name} onChangeText={setName} maxLength={255} autoFocus selectTextOnFocus />
        <Button title="Saqlash" loading={rename.isPending} disabled={!name.trim()} onPress={() => rename.mutate()} />
      </Sheet>
      <OptionSheet
        visible={mode === 'move'}
        title="Qaysi papkaga?"
        options={(folders.data ?? [])
          .filter((f) => f.id !== target?.folder_id)
          .map((f) => ({ value: f.id, label: f.name, description: f.visibility === 'client' ? 'Mijozga ko‘rinadi' : 'Faqat jamoa', icon: FOLDER_KIND[f.kind].icon }))}
        selected={[]}
        multiple={false}
        searchable={false}
        onClose={() => setMode(null)}
        onToggle={(folderId) => move.mutate(folderId)}
      />
    </>
  );

  return { open, element };
}
