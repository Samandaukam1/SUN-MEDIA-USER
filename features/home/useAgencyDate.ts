import { focusManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { agencyDateKey, agencyDayRange } from '@/lib/time';

/** Refresh date-scoped home queries at agency midnight and after returning to the app. */
export function useAgencyDate(): string {
  const [dateKey, setDateKey] = useState(() => agencyDateKey());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      const today = agencyDateKey();
      setDateKey(today);
      const midnight = new Date(agencyDayRange(today).to).getTime();
      timer = setTimeout(refresh, Math.max(1_000, midnight - Date.now() + 100));
    };

    refresh();
    const unsubscribe = focusManager.subscribe((focused) => {
      if (focused) refresh();
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return dateKey;
}
