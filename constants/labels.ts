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
  shot: { label: 'Syomka tugadi', tone: 'violet', icon: 'film' },
  editing: { label: 'Montaj', tone: 'accent', icon: 'scissors' },
  internal_review: { label: 'Ichki tekshiruv', tone: 'info', icon: 'eye' },
  // Kept for history: the client approval step is no longer part of the workflow.
  client_review: { label: 'Ichki tekshiruv', tone: 'info', icon: 'eye' },
  revision: { label: 'Qayta ishlash', tone: 'danger', icon: 'rotate-ccw' },
  approved: { label: 'Tayyor', tone: 'success', icon: 'check-circle' },
  scheduled: { label: 'Rejalashtirildi', tone: 'info', icon: 'calendar' },
  published: { label: 'Joylandi', tone: 'success', icon: 'send' },
  cancelled: { label: 'Bekor qilindi', tone: 'neutral', icon: 'x-circle' },
};

/** The six states a client follows; every internal step folds into one of them. */
const CLIENT_STATUS = {
  preparing: { label: 'Tayyorlanmoqda', tone: 'neutral', icon: 'edit-3' },
  shooting: { label: 'Syomka', tone: 'violet', icon: 'video' },
  editing: { label: 'Montaj', tone: 'accent', icon: 'scissors' },
  ready: { label: 'Tayyor', tone: 'success', icon: 'check-circle' },
  scheduled: { label: 'Rejalashtirilgan', tone: 'info', icon: 'calendar' },
  published: { label: 'Joylandi', tone: 'success', icon: 'send' },
} satisfies Record<string, Labelled & { icon: IconName }>;

const CLIENT_OF: Record<Enums['content_status'], keyof typeof CLIENT_STATUS | null> = {
  idea: 'preparing',
  script: 'preparing',
  ready_for_shoot: 'shooting',
  shooting: 'shooting',
  shot: 'editing',
  editing: 'editing',
  internal_review: 'editing',
  client_review: 'editing',
  revision: 'editing',
  approved: 'ready',
  scheduled: 'scheduled',
  published: 'published',
  cancelled: null,
};

/** Clients only observe: they see where the work is, never the internal checks. */
export function contentStatusFor(status: Enums['content_status'], isClient: boolean): Labelled & { icon: IconName } {
  if (!isClient) return CONTENT_STATUS[status];
  const key = CLIENT_OF[status];
  return key ? CLIENT_STATUS[key] : CONTENT_STATUS.cancelled;
}

/** Statuses behind each client filter chip (Studiya). */
export const CLIENT_STAGE_FILTERS: { key: string; label: string; statuses: Enums['content_status'][] }[] = (Object.keys(CLIENT_STATUS) as (keyof typeof CLIENT_STATUS)[]).map((key) => ({
  key,
  label: CLIENT_STATUS[key].label,
  statuses: (Object.keys(CLIENT_OF) as Enums['content_status'][]).filter((s) => CLIENT_OF[s] === key),
}));

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

/** The production path grouped into steps people recognise (the pipeline strip on a content page). */
export type ContentStage = { key: string; label: string; icon: IconName; statuses: Enums['content_status'][] };

const STAFF_STAGES: ContentStage[] = [
  { key: 'idea', label: 'G‘oya', icon: 'zap', statuses: ['idea'] },
  { key: 'script', label: 'Ssenariy', icon: 'edit-3', statuses: ['script'] },
  { key: 'shoot', label: 'Syomka', icon: 'video', statuses: ['ready_for_shoot', 'shooting', 'shot'] },
  { key: 'edit', label: 'Montaj', icon: 'scissors', statuses: ['editing', 'revision'] },
  { key: 'check', label: 'Ichki tekshiruv', icon: 'eye', statuses: ['internal_review', 'client_review'] },
  { key: 'ready', label: 'Tayyor', icon: 'thumbs-up', statuses: ['approved'] },
  { key: 'scheduled', label: 'Rejalashtirildi', icon: 'calendar', statuses: ['scheduled'] },
  { key: 'live', label: 'Joylandi', icon: 'send', statuses: ['published'] },
];

const CLIENT_STAGE_ICONS: Record<string, IconName> = { preparing: 'edit-3', shooting: 'video', editing: 'scissors', ready: 'thumbs-up', scheduled: 'calendar', published: 'send' };

/** Steps for staff, or the six simple steps a client follows. */
export function contentStages(isClient: boolean): ContentStage[] {
  if (!isClient) return STAFF_STAGES;
  return CLIENT_STAGE_FILTERS.map((s) => ({ ...s, icon: CLIENT_STAGE_ICONS[s.key] ?? 'circle' }));
}

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
  revision: { label: 'Qayta ishlash', tone: 'danger', icon: 'rotate-ccw' },
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
  account_manager: 'Akkaunt menejer',
  project_manager: 'Loyiha menejeri',
  smm_manager: 'SMM menejer',
  operator: 'Operator',
  editor: 'Montajyor',
  designer: 'Dizayner',
  copywriter: 'Kopirayter',
  assistant: 'Yordamchi',
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
export const FOLDER_KIND: Record<Enums['folder_kind'], { label: string; hint: string; icon: IconName }> = {
  raw: { label: 'Xom materiallar', hint: 'Syomkadan kelgan video va rasmlar', icon: 'video' },
  edited: { label: 'Montaj versiyalari', hint: 'Montajdagi videolar', icon: 'scissors' },
  approved: { label: 'Tasdiqlangan', hint: 'Mijoz tasdiqlagan tayyor fayllar', icon: 'check-circle' },
  logos: { label: 'Logotiplar', hint: 'Logotiplar', icon: 'star' },
  brandbook: { label: 'Brendbuk', hint: 'Brendbuk va qo‘llanmalar', icon: 'book' },
  music: { label: 'Musiqa', hint: 'Musiqa va ovozlar', icon: 'music' },
  photos: { label: 'Rasmlar', hint: 'Rasmlar', icon: 'image' },
  documents: { label: 'Hujjatlar', hint: 'Hujjatlar', icon: 'file-text' },
  contracts: { label: 'Shartnomalar', hint: 'Shartnomalar', icon: 'briefcase' },
  custom: { label: 'Papka', hint: 'Qo‘shimcha papka', icon: 'folder' },
};

export const VERSION_STATUS: Record<Enums['version_status'], Labelled & { icon: IconName }> = {
  internal_review: { label: 'Tekshiruvda', tone: 'info', icon: 'eye' },
  client_review: { label: 'Mijoz tasdiqlashida', tone: 'warning', icon: 'user-check' },
  changes_requested: { label: 'O‘zgartirish so‘raldi', tone: 'danger', icon: 'rotate-ccw' },
  approved: { label: 'Tasdiqlandi', tone: 'success', icon: 'check-circle' },
  superseded: { label: 'Eski versiya', tone: 'neutral', icon: 'layers' },
};

export const REVISION_STATUS: Record<Enums['revision_status'], Labelled> = {
  open: { label: 'Ochiq', tone: 'danger' },
  in_progress: { label: 'Bajarilmoqda', tone: 'accent' },
  resolved: { label: 'Hal qilindi', tone: 'success' },
  cancelled: { label: 'Bekor', tone: 'neutral' },
};

export const EVENT_TYPE: Record<string, { label: string; icon: IconName; tone: BadgeTone }> = {
  shooting: { label: 'Syomka', icon: 'video', tone: 'violet' },
  publication: { label: 'Post', icon: 'send', tone: 'success' },
  approval_deadline: { label: 'Tasdiqlash', icon: 'check-circle', tone: 'warning' },
  content_due: { label: 'Montaj', icon: 'scissors', tone: 'accent' },
  editing_deadline: { label: 'Montaj', icon: 'scissors', tone: 'accent' },
  design_deadline: { label: 'Dizayn', icon: 'pen-tool', tone: 'info' },
  task_deadline: { label: 'Muddat', icon: 'check-square', tone: 'neutral' },
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
  sop: { label: 'Ish tartibi', icon: 'list' },
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
  owner: 'Rahbar',
  director: 'Direktor',
  admin: 'Administrator',
  project_manager: 'Loyiha menejeri',
  smm_manager: 'SMM menejer',
  operator: 'Operator',
  editor: 'Montajyor',
  designer: 'Dizayner',
  copywriter: 'Kopirayter',
  client_owner: 'Mijoz rahbari',
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
