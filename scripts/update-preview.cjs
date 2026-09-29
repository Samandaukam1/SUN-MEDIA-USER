const { spawnSync } = require('node:child_process');

// env:exec loads remote preview values before the config/build preflight runs.
// Shell-quote the optional update message; never interpret it as a command.
const quote = (value) => "'" + value.replace(/'/g, "'\\''") + "'";
const message = process.argv.slice(2).join(' ');
const command = 'APP_VARIANT=preview node scripts/check-preview-env.cjs && APP_VARIANT=preview npx --yes eas-cli@24.8.0 update --channel preview --environment preview --platform ios' +
  (message ? ' --message ' + quote(message) : '');
const result = spawnSync('npx', ['--yes', 'eas-cli@24.8.0', 'env:exec', 'preview', command], {
  stdio: 'inherit', env: { ...process.env, EXPO_NO_DOTENV: '1' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
