const { Buffer } = require('node:buffer');

// Shared config/build validation. Never print keys or include server credentials in Expo extra.
function validatePreviewEnvironment({ required = false } = {}) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const keys = [process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY].filter(Boolean);
  const projectId = process.env.EAS_PROJECT_ID;
  if (required && (!url || !keys.length || !projectId)) {
    throw new Error('Preview requires EXPO_PUBLIC_SUPABASE_URL, a publishable/anon key and the real EAS_PROJECT_ID in the EAS preview environment.');
  }
  if (url) {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || host === 'localhost' ||
        /\.(localhost|local|internal)$/.test(host) || /^[\d.]+$/.test(host) || host.includes(':')) {
      throw new Error('Preview requires a public HTTPS Supabase hostname; localhost/LAN addresses are not supported.');
    }
  }
  for (const key of keys) {
    if (key.startsWith('sb_publishable_') && key.length > 20) continue;
    let role;
    try { role = JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url').toString()).role; } catch { /* Reject below. */ }
    if (role !== 'anon') throw new Error('Mobile config accepts only Supabase publishable/anon keys, never service_role or secret keys.');
  }
  if (projectId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
    throw new Error('EAS_PROJECT_ID must be the real project UUID from Expo.');
  }
}
module.exports = { validatePreviewEnvironment };

if (require.main === module && (process.env.APP_VARIANT === 'preview' || process.env.EAS_BUILD_PROFILE === 'preview')) {
  validatePreviewEnvironment({ required: true });
  console.log('Preview environment validated (public Supabase config only).');
}
