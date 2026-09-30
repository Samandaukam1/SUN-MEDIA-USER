import type { ReactNode } from 'react';

// The Pro upgrade card lives in features/pro; the UI kit only knows there is one (no import cycle).
let render: ((feature: string) => ReactNode) | null = null;

export function registerProLock(fn: (feature: string) => ReactNode): void {
  render = fn;
}

export function renderProLock(feature: string): ReactNode | null {
  return render ? render(feature) : null;
}
