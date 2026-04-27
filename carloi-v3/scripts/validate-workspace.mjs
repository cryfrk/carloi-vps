import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const requiredPaths = [
  'apps/mobile/package.json',
  'apps/web/package.json',
  'apps/admin-desktop/package.json',
  'apps/admin-mobile/package.json',
  'apps/admin-desktop/src/index.ts',
  'apps/admin-mobile/src/index.ts',
  'packages/shared/src/index.ts',
  'packages/api-client/src/index.ts',
  'packages/admin-core/src/index.ts',
  'packages/vehicle-catalog/src/index.ts',
  'packages/legal/src/index.ts',
  'packages/ui/src/index.ts',
  'packages/garage-obd/src/index.ts',
  'docs/product-flows.md',
  'docs/api-contract.md',
  'docs/admin-system.md',
  'docs/vehicle-catalog-plan.md',
  'docs/legal-risk-notes.md',
  'docs/garage-obd-flow.md'
];

const missing = requiredPaths.filter((entry) => !existsSync(resolve(root, entry)));

if (missing.length) {
  console.error('[carloi-v3] Missing scaffold files:');
  for (const entry of missing) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}

console.log('[carloi-v3] Workspace scaffold validated.');
