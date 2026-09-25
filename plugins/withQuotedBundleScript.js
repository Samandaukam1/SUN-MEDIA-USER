// The React Native template runs `react-native-xcode.sh` through an unquoted command substitution,
// which breaks the "Bundle React Native code and images" build phase when the project path contains
// a space (".../SUNMEDIA USER/..."). This quotes the substitution; it is idempotent across prebuilds.
const { withXcodeProject } = require('expo/config-plugins');

const SCRIPT = "\\\"$NODE_BINARY\\\" --print \\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\"";
const UNQUOTED = '`' + SCRIPT + '`';
const QUOTED = '\\"$(' + SCRIPT + ')\\"';

module.exports = function withQuotedBundleScript(config) {
  return withXcodeProject(config, (cfg) => {
    const phases = cfg.modResults.hash.project.objects.PBXShellScriptBuildPhase ?? {};
    for (const phase of Object.values(phases)) {
      if (phase && typeof phase.shellScript === 'string' && phase.shellScript.includes(UNQUOTED)) {
        phase.shellScript = phase.shellScript.replace(UNQUOTED, QUOTED);
      }
    }
    return cfg;
  });
};
