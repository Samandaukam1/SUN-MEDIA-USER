import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { Fab } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useNav } from '@/lib/routes';

type Action = { label: string; path: string; permission: string };

// Everything a staff member can start from anywhere; each item is shown only with its permission.
const ACTIONS: Action[] = [
  { label: 'Yangi vazifa', path: '/task/new', permission: 'tasks.manage' },
  { label: 'Yangi kontent', path: '/content/new', permission: 'content.manage' },
  { label: 'Yangi syomka', path: '/shooting/new', permission: 'shootings.manage' },
  { label: 'Yangi loyiha', path: '/projects/new', permission: 'projects.manage' },
];

/** "+" on Home: one tap to create a task, content, shooting or project. */
export function QuickCreateFab() {
  const { can } = useAuth();
  const nav = useNav();
  const allowed = ACTIONS.filter((a) => can(a.permission));
  if (allowed.length === 0) return null;

  const open = () => {
    if (allowed.length === 1) {
      nav.go(allowed[0].path);
      return;
    }
    if (Platform.OS === 'ios') {
      const options = [...allowed.map((a) => a.label), 'Bekor qilish'];
      ActionSheetIOS.showActionSheetWithOptions({ title: 'Yaratish', options, cancelButtonIndex: options.length - 1 }, (i) => allowed[i] && nav.go(allowed[i].path));
      return;
    }
    Alert.alert('Yaratish', undefined, [...allowed.map((a) => ({ text: a.label, onPress: () => nav.go(a.path) })), { text: 'Bekor qilish', style: 'cancel' }]);
  };

  return <Fab label="Yaratish" onPress={open} />;
}
