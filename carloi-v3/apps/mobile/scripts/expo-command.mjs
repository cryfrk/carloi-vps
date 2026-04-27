import { spawn } from 'node:child_process';

const [, , expoCommand = 'start', ...args] = process.argv;
const env = {
  ...process.env,
  EXPO_NO_METRO_WORKSPACE_ROOT: 'true',
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.carloi.com',
  RCT_METRO_PORT: process.env.RCT_METRO_PORT || '8090',
};

const child = process.platform === 'win32'
  ? spawn(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', `npx expo ${expoCommand} ${args.join(' ')}`.trim()],
      {
        stdio: 'inherit',
        env,
        shell: false,
      }
    )
  : spawn(
      'npx',
      ['expo', expoCommand, ...args],
      {
        stdio: 'inherit',
        env,
        shell: false,
      }
    );

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
