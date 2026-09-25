import type { BadgeTone } from '@/components/ui/Badge';
import type { IconName } from '@/components/ui/Icon';
import type { Database } from '@/types/database';

type Enums = Database['public']['Enums'];
type Labelled = { label: string; tone: BadgeTone; icon?: IconName };

export const CONTENT_TYPE: Record<Enums['content_type'], { label: string; icon: IconName }> = {
  reel: { label: 'Reels', icon: 'film' },
  video: { label: 'Video', icon: 'video' },
  post: { label: 'Post', icon: 'image' },
  carousel: { label: 'Karusel', icon: 'layers' },
  story: { label: 'Stories', icon: 'circle' },
  design: { label: 'Dizayn', icon: 'pen-tool' },
  ad_creative: { label: 'Reklama kreativi', icon: 'target' },
  other: { label: 'Boshqa', icon: 'file' },
};

export const CONTENT_TYPE_LABEL: Record<Enums['content_type'], string> = Object.fromEntries(
  Object.entries(CONTENT_TYPE).map(([k, v]) => [k, v.label]),
) as Record<Enums['content_type'], string>;

export const PLATFORM: Record<Enums['social_platform'], { label: string; icon: IconName }> = {
  instagram: { label: 'Instagram', icon: 'instagram' },
  tiktok: { label: 'TikTok', icon: 'music' },
  youtube: { label: 'YouTube', icon: 'youtube' },
  facebook: { label: 'Facebook', icon: 'facebook' },
  telegram: { label: 'Telegram', icon: 'send' },
  linkedin: { label: 'LinkedIn', icon: 'linkedin' },
  x: { label: 'X', icon: 'twitter' },
  website: { label: 'Veb-sayt', icon: 'globe' },
  other: { label: 'Boshqa', icon: 'share-2' },
};

export const PLATFORM_LABEL: Record<Enums['social_platform'], string> = Object.fromEntries(
  Object.entries(PLATFORM).map(([k, v]) => [k, v.label]),
) as Record<Enums['social_platform'], string>;

/** Recommended frame for each format, shown next to the platform ("Instagram Reels 9:16"). */
export const CONTENT_TYPE_ASPECT: Partial<Record<Enums['content_type'], string>> = {
  reel: '9:16',
  story: '9:16',
  video: '16:9',
  post: '4:5',
  carousel: '4:5',
};

export const CONTENT_STATUS: Record<Enums['content_status'], Labelled & { icon: IconName }> = {
  idea: { label: 'G‘oya', tone: 'neutral', icon: 'zap' },
  script: { label: 'Ssenariy', tone: 'info', icon: 'edit-3' },
  ready_for_shoot: { label: 'Syomkaga tayyor', tone: 'info', icon: 'check-square' },
  shooting: { label: 'Syomka', tone: 'violet', icon: 'video' },
  shot: { label: 'Suratga olindi', tone: 'violet', icon: 'film' },
  editing: { label: 'Montaj', tone: 'accent', icon: 'scissors' },
  internal_review: { label: 'Ichki tekshiruv', tone: 'info', icon: 'eye' },
  client_review: { label: 'Tasdiqlash kutilmoqda', tone: 'warning', icon: 'clock' },
  revision: { label: 'Revision', tone: 'danger', icon: 'rotate-ccw' },
  approved: { label: 'Tasdiqlandi', tone: 'success', icon: 'check-circle' },
  scheduled: { label: 'Rejalashtirildi', tone: 'info', icon: 'calendar' },
  published: { label: 'Joylandi', tone: 'success', icon: 'send' },
  cancelled: { label: 'Bekor qilindi', tone: 'neutral', icon: 'x-circle' },
};

/** Happy path order (revision loops back to editing; cancelled is off-path). */
export const CONTENT_PIPELINE: Enums['content_status'][] = [
  'idea',
  'script',
  'ready_for_shoot',
  'shooting',
  'shot',
  'editing',
  'internal_review',
  'client_review',
  'approved',
  'scheduled',
  'published',
];

/** 0…1 progress of a content item through production (revision sits with editing). */
export function contentProgress(status: Enums['content_status']): number {
  if (status === 'cancelled') return 0;
  const at = status === 'revision' ? CONTENT_PIPELINE.indexOf('editing') : CONTENT_PIPELINE.indexOf(status);
  return Math.max(0, at) / (CONTENT_PIPELINE.length - 1);
}

export const TASK_STATUS: Record<Enums['task_status'], Labelled> = {
  todo: { label: 'Navbatda', tone: 'neutral', icon: 'circle' },
  in_progress: { label: 'Jarayonda', tone: 'accent', icon: 'play-circle' },
  in_review: { label: 'Tekshiruvda', tone: 'info', icon: 'eye' },
  revision: { label: 'Revision', tone: 'danger', icon: 'rotate-ccw' },
  done: { label: 'Bajarildi', tone: 'success', icon: 'check-circle' },
  cancelled: { label: 'Bekor', tone: 'neutral', icon: 'x-circle' },
};

export const OVERDUE: Labelled = { label: 'Muddati o‘tgan', tone: 'danger', icon: 'alert-triangle' };

export const TASK_TYPE: Record<Enums['task_type'], { label: string; icon: IconName }> = {
  shooting: { label: 'Syomka', icon: 'video' },
  editing: { label: 'Montaj', icon: 'scissors' },
  design: { label: 'Dizayn', icon: 'pen-tool' },
  copywriting: { label: 'Kopirayting', icon: 'type' },
  publishing: { label: 'Nashr', icon: 'send' },
  review: { label: 'Tekshiruv', icon: 'eye' },
  strategy: { label: 'Strategiya', icon: 'compass' },
  meeting: { label: 'Uchrashuv', icon: 'users' },
  other: { label: 'Boshqa', icon: 'check-square' },
};

export const TASK_TYPE_LABEL: Record<Enums['task_type'], string> = Object.fromEntries(
  Object.entries(TASK_TYPE).map(([k, v]) => [k, v.label]),
) as Record<Enums['task_type'], string>;

export const PRIORITY: Record<Enums['priority_level'], Labelled> = {
  low: { label: 'Past', tone: 'neutral', icon: 'arrow-down' },
  normal: { label: 'Oddiy', tone: 'neutral', icon: 'minus' },
  high: { label: 'Muhim', tone: 'warning', icon: 'arrow-up' },
  urgent: { label: 'Shoshilinch', tone: 'danger', icon: 'alert-octagon' },
};

export const SHOOTING_STATUS: Record<Enums['shooting_status'], Labelled> = {
  planned: { label: 'Rejada', tone: 'neutral' },
  confirmed: { label: 'Tasdiqlangan', tone: 'info' },
  in_progress: { label: 'Davom etmoqda', tone: 'accent' },
  completed: { label: 'Yakunlandi', tone: 'success' },
  postponed: { label: 'Ko‘chirildi', tone: 'warning' },
  cancelled: { label: 'Bekor qilindi', tone: 'neutral' },
};

export const ATTENDANCE_STATUS: Record<Enums['attendance_status'], Labelled & { icon: IconName }> = {
  present: { label: 'Keldi', tone: 'success', icon: 'check' },
  late: { label: 'Kechikdi', tone: 'warning', icon: 'clock' },
  absent: { label: 'Kelmadi', tone: 'danger', icon: 'x' },
  excused: { label: 'Sababli', tone: 'info', icon: 'file-text' },
  vacation: { label: 'Ta’tilda', tone: 'violet', icon: 'sun' },
  remote: { label: 'Masofadan', tone: 'accent', icon: 'home' },
};

export const SHOOTING_ATTENDANCE_STATUS: Record<Enums['shooting_attendance_status'], Labelled & { icon: IconName }> = {
  pending: { label: 'Belgilanmagan', tone: 'neutral', icon: 'help-circle' },
  arrived: { label: 'Keldi', tone: 'success', icon: 'check' },
  late: { label: 'Kechikdi', tone: 'warning', icon: 'clock' },
  absent: { label: 'Kelmadi', tone: 'danger', icon: 'x' },
  excused: { label: 'Sababli', tone: 'info', icon: 'file-text' },
};

export const TEAM_ROLE_LABEL: Record<Enums['team_role'], string> = {
  account_manager: 'Account manager',
  project_manager: 'Project manager',
  smm_manager: 'SMM manager',
  operator: 'Operator',
  editor: 'Montajyor',
  designer: 'Dizayner',
  copywriter: 'Kopirayter',
  assistant: 'Assistent',
};

export const PROJECT_STATUS: Record<Enums['project_status'], Labelled> = {
  planning: { label: 'Rejalashtirilmoqda', tone: 'info' },
  active: { label: 'Faol', tone: 'success' },
  on_hold: { label: 'To‘xtatilgan', tone: 'warning' },
  completed: { label: 'Yakunlangan', tone: 'neutral' },
  cancelled: { label: 'Bekor qilingan', tone: 'neutral' },
};

export const PROJECT_KIND: Record<Enums['project_kind'], string> = {
  retainer: 'Oylik xizmat',
  campaign: 'Kampaniya',
  one_off: 'Bir martalik',
};

export const PUBLICATION_STATUS: Record<Enums['publication_status'], Labelled> = {
  planned: { label: 'Rejada', tone: 'neutral' },
  scheduled: { label: 'Rejalashtirildi', tone: 'info' },
  published: { label: 'Joylandi', tone: 'success' },
  failed: { label: 'Xato', tone: 'danger' },
  cancelled: { label: 'Bekor', tone: 'neutral' },
};

/** Calendar event types from get_calendar_events: told apart by icon + label, not colour alone. */
export const EVENT_TYPE: Record<string, { label: string; icon: IconName; tone: BadgeTone }> = {
  shooting: { label: 'Syomka', icon: 'video', tone: 'violet' },
  publication: { label: 'Nashr', icon: 'send', tone: 'success' },
  approval_deadline: { label: 'Mijoz tasdig‘i', icon: 'check-circle', tone: 'warning' },
  content_due: { label: 'Montaj muddati', icon: 'scissors', tone: 'accent' },
  editing_deadline: { label: 'Montaj muddati', icon: 'scissors', tone: 'accent' },
  design_deadline: { label: 'Dizayn muddati', icon: 'pen-tool', tone: 'info' },
  task_deadline: { label: 'Vazifa muddati', icon: 'check-square', tone: 'neutral' },
  meeting: { label: 'Uchrashuv', icon: 'users', tone: 'info' },
  company_meeting: { label: 'Umumiy yig‘ilish', icon: 'users', tone: 'info' },
  company_holiday: { label: 'Bayram', icon: 'gift', tone: 'success' },
  company_day_off: { label: 'Dam olish kuni', icon: 'sun', tone: 'success' },
  company_company_event: { label: 'Kompaniya tadbiri', icon: 'star', tone: 'violet' },
  company_training: { label: 'Trening', icon: 'book-open', tone: 'info' },
  company_birthday: { label: 'Tug‘ilgan kun', icon: 'gift', tone: 'accent' },
};

export const COMPANY_EVENT_KIND: Record<'meeting' | 'holiday' | 'day_off' | 'company_event' | 'training' | 'birthday', { label: string; icon: IconName }> = {
  meeting: { label: 'Umumiy yig‘ilish', icon: 'users' },
  holiday: { label: 'Bayram', icon: 'gift' },
  day_off: { label: 'Dam olish kuni', icon: 'sun' },
  company_event: { label: 'Kompaniya tadbiri', icon: 'star' },
  training: { label: 'Trening', icon: 'book-open' },
  birthday: { label: 'Tug‘ilgan kun', icon: 'gift' },
};

export const DOCUMENT_CATEGORY: Record<'sop' | 'guide' | 'brand' | 'policy' | 'template' | 'other', { label: string; icon: IconName }> = {
  sop: { label: 'SOP', icon: 'list' },
  guide: { label: 'Qo‘llanma', icon: 'book-open' },
  brand: { label: 'Brend aktivlari', icon: 'award' },
  policy: { label: 'Qoidalar', icon: 'shield' },
  template: { label: 'Shablonlar', icon: 'copy' },
  other: { label: 'Boshqa', icon: 'file-text' },
};

export function eventMeta(type: string) {
  return EVENT_TYPE[type] ?? { label: 'Hodisa', icon: 'calendar' as IconName, tone: 'neutral' as BadgeTone };
}

export const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  director: 'Direktor',
  admin: 'Administrator',
  project_manager: 'Project manager',
  smm_manager: 'SMM manager',
  operator: 'Operator',
  editor: 'Montajyor',
  designer: 'Dizayner',
  copywriter: 'Kopirayter',
  client_owner: 'Mijoz (egasi)',
  client_employee: 'Mijoz xodimi',
};

export function contentFormat(type: Enums['content_type'], platform?: Enums['social_platform'] | null): string {
  const parts = [platform ? PLATFORM_LABEL[platform] : null, CONTENT_TYPE_LABEL[type], CONTENT_TYPE_ASPECT[type]];
  return parts.filter(Boolean).join(' ');
}

/** "SAFI Reels #12" style short reference. */
export function contentRef(code: string | null | undefined, type: Enums['content_type'], number: number | null | undefined): string {
  return [code, CONTENT_TYPE_LABEL[type], number ? `#${number}` : null].filter(Boolean).join(' ');
}
