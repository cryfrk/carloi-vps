import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const targetIcon = resolve(projectRoot, 'assets', 'carloi.png');
const sourceCandidates = [
  process.env.CARLOI_ICON_SOURCE,
  resolve(projectRoot, '..', 'carloi.png'),
  targetIcon,
].filter(Boolean);

const sourceIcon = sourceCandidates.find((candidate) => existsSync(candidate));

if (!sourceIcon) {
  throw new Error(
    `Carloi icon source not found. Checked: ${sourceCandidates.join(', ')}`,
  );
}

mkdirSync(dirname(targetIcon), { recursive: true });
if (resolve(sourceIcon) !== resolve(targetIcon)) {
  copyFileSync(sourceIcon, targetIcon);
}

console.log(`[CarloiV2][Icon] synced ${sourceIcon} -> ${targetIcon}`);
