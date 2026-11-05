'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { hash, validateBundle } = require('./core.cjs');
const runtimeFiles = require('./runtime-files.json');

async function buildRelease(source, output, tag) {
  const manifest = JSON.parse(await fs.readFile(path.join(source, 'manifest.json'), 'utf8'));
  if (tag && tag !== `v${manifest.version}`) throw new Error('Tag phải khớp version trong manifest.json.');
  const files = await Promise.all(runtimeFiles.map(async name => {
    const bytes = await fs.readFile(path.join(source, name));
    return { path: name, sha256: hash(bytes), data: bytes.toString('base64') };
  }));
  const bundle = { format: 1, version: manifest.version, files };
  validateBundle(bundle, manifest.version);
  const packageRoot = path.join(output, 'PancakeAssistantPro');
  await fs.mkdir(path.join(packageRoot, 'extension'), { recursive: true });
  await fs.mkdir(path.join(packageRoot, 'updater'), { recursive: true });
  for (const item of files) await fs.writeFile(path.join(packageRoot, 'extension', item.path), Buffer.from(item.data, 'base64'));
  for (const name of ['install.ps1', 'host.cjs', 'core.cjs']) await fs.copyFile(path.join(source, 'updater', name), path.join(packageRoot, 'updater', name));
  await fs.copyFile(path.join(source, 'install-update.cmd'), path.join(packageRoot, 'install-update.cmd'));
  await fs.copyFile(path.join(source, 'docs', 'AUTO_UPDATE.md'), path.join(packageRoot, 'HUONG-DAN.md'));
  await fs.writeFile(path.join(output, 'pancake-update.json'), JSON.stringify(bundle));
  return { version: manifest.version, packageRoot };
}
if (require.main === module) {
  buildRelease(path.resolve(__dirname, '..'), path.resolve(process.argv[2] || 'dist'), process.env.GITHUB_REF_NAME)
    .then(result => console.log(`Đã đóng gói ${result.version}: ${result.packageRoot}`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { buildRelease };
