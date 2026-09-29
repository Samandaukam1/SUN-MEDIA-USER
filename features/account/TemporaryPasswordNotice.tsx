import { ListGroup, ListRow } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useNav } from '@/lib/routes';

/** Shown until the person replaces the one-time password an admin handed over. */
export function TemporaryPasswordNotice() {
  const { context } = useAuth();
  const nav = useNav();
  if (!context?.temporary_password) return null;
  return (
    <ListGroup>
      <ListRow
        icon="lock"
        iconTone="warning"
        title="Vaqtinchalik parolni almashtiring"
        subtitle="Administrator bergan parol o‘rniga o‘zingiz biladigan parol qo‘ying"
        onPress={() => nav.go('/account/password')}
      />
    </ListGroup>
  );
}
