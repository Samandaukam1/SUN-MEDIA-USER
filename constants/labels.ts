import type { BadgeTone } from '@/components/ui/Badge';
import type { Database } from '@/types/database';

type Enums = Database['public']['Enums'];

export const CONTENT_TYPE_LABEL: Record<Enums['content_type'], string> = {
  reel: 'Reels',
  video: 'Video',
  post: 'Post',
  carousel: 'Karusel',
  story: 'Stories',
  design: 'Dizayn',
  ad_creative: 'Reklama kreativi',
  other: 'Boshqa',
};

export const PLATFORM_LABEL: Record<Enums['social_platform'], string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
  telegram: 'Telegram',
  linkedin: 'LinkedIn',
  x: 'X',
  website: 'Veb-sayt',
  other: 'Boshqa',
};

/** Recommended frame for each format, shown next to the platform ("Instagram Reels 9:16"). */
export const CONTENT_TYPE_ASPECT: Partial<Record<Enums['content_type'], string>> = {
  reel: '9:16',
  story: '9:16',
  video: '16:9',
  post: '4:5',
  carousel: '4:5',
};

export const CONTENT_STATUS: Record<Enums['content_status'], { label: string; tone: BadgeTone }> = {
  idea: { label: 'G‘oya', tone: 'neutral' },
  script: { label: 'Ssenariy', tone: 'info' },
  shooting: { label: 'Syomka', tone: 'violet' },
  editing: { label: 'Montaj', tone: 'accent' },
  internal_review: { label: 'Ichki tekshiruv', tone: 'info' },
  client_review: { label: 'Tasdiqlash kutilmoqda', tone: 'warning' },
  revision: { label: 'Revision', tone: 'danger' },
  approved: { label: 'Tasdiqlandi', tone: 'success' },
  scheduled: { label: 'Rejalashtirildi', tone: 'info' },
  published: { label: 'Joylandi', tone: 'success' },
  cancelled: { label: 'Bekor qilindi', tone: 'neutral' },
};

export const CONTENT_PIPELINE: Enums['content_status'][] = [
  'idea', 'script', 'shooting', 'editing', 'internal_review', 'client_review', 'revision', 'approved', 'scheduled', 'published',
];

export const TASK_STATUS: Record<Enums['task_status'], { label: string; tone: BadgeTone }> = {
  todo: { label: 'Navbatda', tone: 'neutral' },
  in_progress: { label: 'Jarayonda', tone: 'accent' },
  in_review: { label: 'Tekshiruvda', tone: 'info' },
  revision: { label: 'Revision', tone: 'danger' },
  done: { label: 'Bajarildi', tone: 'success' },
  cancelled: { label: 'Bekor', tone: 'neutral' },
};

export const TASK_TYPE_LABEL: Record<Enums['task_type'], string> = {
  shooting: 'Syomka',
  editing: 'Montaj',
  design: 'Dizayn',
  copywriting: 'Kopirayting',
  publishing: 'Nashr',
  review: 'Tekshiruv',
  strategy: 'Strategiya',
  meeting: 'Uchrashuv',
  other: 'Boshqa',
};

export const PRIORITY: Record<Enums['priority_level'], { label: string; tone: BadgeTone }> = {
  low: { label: 'Past', tone: 'neutral' },
  normal: { label: 'Oddiy', tone: 'neutral' },
  high: { label: 'Muhim', tone: 'warning' },
  urgent: { label: 'Shoshilinch', tone: 'danger' },
};

export const SHOOTING_STATUS: Record<Enums['shooting_status'], { label: string; tone: BadgeTone }> = {
  planned: { label: 'Rejada', tone: 'neutral' },
  confirmed: { label: 'Tasdiqlangan', tone: 'info' },
  in_progress: { label: 'Davom etmoqda', tone: 'accent' },
  completed: { label: 'Yakunlandi', tone: 'success' },
  postponed: { label: 'Ko‘chirildi', tone: 'warning' },
  cancelled: { label: 'Bekor qilindi', tone: 'neutral' },
};

export const ATTENDANCE_STATUS: Record<Enums['attendance_status'], { label: string; tone: BadgeTone }> = {
  present: { label: 'Keldi', tone: 'success' },
  late: { label: 'Kechikdi', tone: 'warning' },
  absent: { label: 'Kelmadi', tone: 'danger' },
  excused: { label: 'Sababli', tone: 'info' },
  vacation: { label: 'Ta’tilda', tone: 'violet' },
  remote: { label: 'Masofadan', tone: 'accent' },
};

export const SHOOTING_ATTENDANCE_STATUS: Record<Enums['shooting_attendance_status'], { label: string; tone: BadgeTone }> = {
  pending: { label: 'Belgilanmagan', tone: 'neutral' },
  arrived: { label: 'Keldi', tone: 'success' },
  late: { label: 'Kechikdi', tone: 'warning' },
  absent: { label: 'Kelmadi', tone: 'danger' },
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

export function contentFormat(type: Enums['content_type'], platform?: Enums['social_platform'] | null): string {
  const parts = [platform ? PLATFORM_LABEL[platform] : null, CONTENT_TYPE_LABEL[type], CONTENT_TYPE_ASPECT[type]];
  return parts.filter(Boolean).join(' ');
}
