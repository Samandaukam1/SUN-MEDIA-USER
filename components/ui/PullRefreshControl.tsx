import { useEffect, useRef, useState } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

type Props = Omit<RefreshControlProps, 'refreshing' | 'onRefresh'> & {
  /** Data is being refetched (e.g. query.isRefetching). */
  busy: boolean;
  onRefresh: () => unknown;
};

/**
 * Pull-to-refresh that spins only after the user pulls, until that refetch settles. Background
 * refetches (realtime, focus) never pop a spinner or push the content down.
 */
export function PullRefreshControl({ busy, onRefresh, ...rest }: Props) {
  const { colors } = useTheme();
  const [pulled, setPulled] = useState(false);
  const sawBusy = useRef(false);

  useEffect(() => {
    if (!pulled) return;
    if (busy) {
      sawBusy.current = true;
      return;
    }
    if (sawBusy.current) {
      sawBusy.current = false;
      setPulled(false);
      return;
    }
    // Nothing started fetching (fresh cache): let the gesture finish gracefully.
    const t = setTimeout(() => setPulled(false), 1200);
    return () => clearTimeout(t);
  }, [busy, pulled]);

  return (
    <RefreshControl
      {...rest}
      tintColor={colors.accent}
      refreshing={pulled}
      onRefresh={() => {
        sawBusy.current = false;
        setPulled(true);
        Promise.resolve(onRefresh()).catch(() => undefined);
      }}
    />
  );
}
