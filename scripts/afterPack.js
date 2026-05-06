// electron-builder afterPack hook — ad-hoc sign macOS .app so Gatekeeper
// doesn't mark it as "damaged" when downloaded from the internet.
// Without a paid Apple Developer cert we still get the "unidentified developer"
// warning, but users can right-click → Open to bypass it (vs. no way around
// the "is damaged and can't be opened" error).
const { execSync } = require('child_process');
const path = require('path');

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  console.log(`[afterPack] Ad-hoc signing ${appPath}`);
  execSync(
    `codesign --force --deep --sign - --timestamp=none "${appPath}"`,
    { stdio: 'inherit' }
  );
  console.log('[afterPack] Done.');
};
