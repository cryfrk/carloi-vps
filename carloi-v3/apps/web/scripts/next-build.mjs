import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const env = {
  ...process.env,
  NEXT_IGNORE_INCORRECT_LOCKFILE: process.env.NEXT_IGNORE_INCORRECT_LOCKFILE || '1',
};

const nextCli = resolve('node_modules', 'next', 'dist', 'bin', 'next');

const result = spawnSync(process.execPath, [nextCli, 'build'], {
  stdio: 'inherit',
  env,
});

if (typeof result.status === 'number' && result.status !== 0) {
  process.exit(result.status);
}

if (result.error) {
  throw result.error;
}
