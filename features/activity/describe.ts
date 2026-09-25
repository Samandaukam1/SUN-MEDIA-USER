import type { IconName } from '@/components/ui';
import { ATTENDANCE_STATUS, CONTENT_STATUS, PUBLICATION_STATUS, SHOOTING_ATTENDANCE_STATUS, SHOOTING_STATUS, TASK_STATUS } from '@/constants/labels';
import type { ActivityItem } from '@/features/dashboard/api';

type Described = { icon: IconName; text: string; detail: string | null };

function statusLabel(map: Record<string, { label: string }>, status: string | undefined) {
  return status ? (map[status]?.label ?? status) : null;
}

/** Turns an audit entry into one readable Uzbek sentence for the activity stream. */
export function describeActivity(item: ActivityItem): Described {
  const who = item.actor_name ?? 'Tizim';
  const { status, old_status: oldStatus, late_minutes: late } = item.changes ?? {};
  const label = item.label ?? item.changes?.title ?? null;
  const insert = item.action.endsWith('.insert');

  switch (item.entity_type) {
    case 'content_items': {
      if (insert) return { icon: 'plus-circle', text: `${who} yangi kontent yaratdi`, detail: label };
      const to = statusLabel(CONTENT_STATUS, status);
      if (status === 'approved') return { icon: 'check-circle', text: `${label ?? 'Kontent'} tasdiqlandi`, detail: who };
      if (status === 'revision') return { icon: 'rotate-ccw', text: `${label ?? 'Kontent'} revisionga qaytdi`, detail: who };
      if (status === 'published') return { icon: 'send', text: `${label ?? 'Kontent'} joylandi`, detail: who };
      return {
        icon: 'git-commit',
        text: `${who}: ${statusLabel(CONTENT_STATUS, oldStatus) ?? '—'} → ${to}`,
        detail: label,
      };
    }
    case 'content_publications':
      return insert
        ? { icon: 'calendar', text: `${who} nashrni rejalashtirdi`, detail: label }
        : { icon: 'send', text: `Nashr: ${statusLabel(PUBLICATION_STATUS, status)}`, detail: label };
    case 'revisions':
      return { icon: 'rotate-ccw', text: `${who} o‘zgartirish so‘radi`, detail: label };
    case 'tasks':
      return insert
        ? { icon: 'check-square', text: `${who} vazifa yaratdi`, detail: label }
        : { icon: status === 'done' ? 'check-circle' : 'activity', text: `${who}: vazifa ${statusLabel(TASK_STATUS, status)?.toLowerCase()}`, detail: label };
    case 'shootings':
      return insert
        ? { icon: 'video', text: `${who} syomka rejalashtirdi`, detail: label }
        : { icon: 'video', text: `Syomka: ${statusLabel(SHOOTING_STATUS, status)}`, detail: label };
    case 'shooting_attendance':
      return {
        icon: 'map-pin',
        text: `${who} ${item.subject_name ?? 'xodim'}ni syomkada “${statusLabel(SHOOTING_ATTENDANCE_STATUS, status)}” deb belgiladi`,
        detail: [label, late ? `${late} daq kechikish` : null].filter(Boolean).join(' · ') || null,
      };
    case 'attendance':
      return {
        icon: 'user-check',
        text: `${who} ${item.subject_name ?? 'xodim'}ni “${statusLabel(ATTENDANCE_STATUS, status)?.toLowerCase()}” deb belgiladi`,
        detail: late ? `${late} daqiqa kechikish` : null,
      };
    case 'files':
      return { icon: 'upload-cloud', text: `${who} fayl yukladi`, detail: label };
    case 'projects':
      return insert ? { icon: 'folder-plus', text: `${who} yangi loyiha ochdi`, detail: label } : { icon: 'folder', text: `Loyiha yangilandi`, detail: label };
    case 'clients':
      return insert ? { icon: 'briefcase', text: `Yangi mijoz qo‘shildi`, detail: label } : { icon: 'briefcase', text: `Mijoz holati yangilandi`, detail: label };
    case 'monthly_reports':
      return { icon: 'bar-chart-2', text: status === 'published' ? 'Oylik hisobot e’lon qilindi' : 'Oylik hisobot yangilandi', detail: label };
    default:
      return { icon: 'activity', text: `${who}: ${item.action}`, detail: label };
  }
}
