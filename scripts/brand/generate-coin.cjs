/* Export the exact native coin artwork as an SVG for the admin/web app. */
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');

const sourcePath = path.resolve(__dirname, '../../features/sun-coin/coinSvg.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const compiledExports = {};
new Function('require', 'exports', compiled)(createRequire(sourcePath), compiledExports);
const outputPath = path.resolve(__dirname, '../../assets/sun-coin/sun-coin.svg');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, compiledExports.sunCoinSvg() + '\n');
console.log(path.relative(process.cwd(), outputPath));
