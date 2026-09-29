#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function normalizeToSemver(tag, defaultVer = '1.1.1') {
  if (!tag || typeof tag !== 'string') return defaultVer;
  const clean = tag.trim().replace(/^v/i, '');

  // Handle 4-part Windows / assembly version tags: e.g. 1.1.0.3, 1.1.0.1
  const m4 = clean.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m4) {
    const [, maj, min, pat, bld] = m4;
    // If patch segment is '0', map 1.1.0.X -> 1.1.X (e.g. 1.1.0.3 -> 1.1.3)
    // Otherwise add build to patch: 1.1.1.2 -> 1.1.3
    return pat === '0'
      ? `${maj}.${min}.${bld}`
      : `${maj}.${min}.${parseInt(pat, 10) + parseInt(bld, 10)}`;
  }

  // Handle standard SemVer 2.0: 1.1.1, 1.2.0, 2.0.0-rc.1, etc.
  const m3 = clean.match(/^(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/);
  if (m3) {
    return m3[1];
  }

  return defaultVer;
}

function syncVersion() {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version || '1.1.1';

  const refName = (process.env.REF_NAME || process.env.GITHUB_REF_NAME || process.argv[2] || '').trim();
  const refType = (process.env.REF_TYPE || process.env.GITHUB_REF_TYPE || (refName.startsWith('v') ? 'tag' : '')).trim();

  let targetVersion = currentVersion;
  if (refType === 'tag' || refName.startsWith('v') || /^\d+\.\d+/.test(refName)) {
    targetVersion = normalizeToSemver(refName, currentVersion);
  }

  pkg.version = targetVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  console.log(`[sync-version] Tag: "${refName}" -> SemVer: "${targetVersion}"`);

  // Write GitHub Actions step output if available
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput && fs.existsSync(path.dirname(githubOutput))) {
    const tagName = (refType === 'tag' && refName) ? refName : `v${targetVersion}`;
    fs.appendFileSync(githubOutput, `version=${targetVersion}\n`, 'utf8');
    fs.appendFileSync(githubOutput, `tag_name=${tagName}\n`, 'utf8');
  }

  return targetVersion;
}

if (require.main === module) {
  syncVersion();
}

module.exports = { normalizeToSemver, syncVersion };
