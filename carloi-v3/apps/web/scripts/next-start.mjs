import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const env = {
  ...process.env,
  PORT: process.env.PORT || '3095',
  HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
  NEXT_IGNORE_INCORRECT_LOCKFILE: process.env.NEXT_IGNORE_INCORRECT_LOCKFILE || '1',
};

const serverPath = resolve('.next', 'standalone', 'server.js');
const nextCli = resolve('node_modules', 'next', 'dist', 'bin', 'next');
const args = existsSync(serverPath) ? [serverPath] : [nextCli, 'start', '-p', env.PORT];

const result = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  env,
});

if (typeof result.status === 'number' && result.status !== 0) {
  process.exit(result.status);
}

if (result.error) {
  throw result.error;
}
