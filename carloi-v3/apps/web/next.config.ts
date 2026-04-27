import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const projectDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@carloi-v3/api-client',
    '@carloi-v3/shared',
    '@carloi-v3/legal',
    '@carloi-v3/ui',
    '@carloi-v3/vehicle-catalog',
    '@carloi-v3/garage-obd',
  ],
  outputFileTracingRoot: join(projectDir, '../..'),
};

export default nextConfig;
