import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { SkeletonCards } from './Skeleton';
import { EmptyState, ErrorState } from './States';
import type { IconName } from './Icon';

type Empty = { icon?: IconName; title: string; description?: string; actionLabel?: string; onAction?: () => void };

type Props<T> = {
  query: Pick<UseQueryResult<T>, 'data' | 'error' | 'isPending' | 'refetch'>;
  children: (data: T) => ReactNode;
  /** Returns true when the loaded data should show the empty state. */
  isEmpty?: (data: T) => boolean;
  empty?: Empty;
  skeleton?: ReactNode;
};

/**
 * One place for the loading → error (with retry) → empty → content sequence, so every async
 * screen behaves the same. Cached data stays visible while a background refetch fails.
 */
export function QueryView<T>({ query, children, isEmpty, empty, skeleton }: Props<T>) {
  if (query.isPending) return <>{skeleton ?? <SkeletonCards count={3} />}</>;
  if (query.error && query.data === undefined) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const data = query.data as T;
  if (isEmpty?.(data) && empty) return <EmptyState {...empty} />;
  return <>{children(data)}</>;
}
