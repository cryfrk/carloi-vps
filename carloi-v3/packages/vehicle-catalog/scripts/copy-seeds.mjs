import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const packageDir = resolve(currentDir, '..');
const sourceDir = resolve(packageDir, 'src', 'seeds');
const targetDir = resolve(packageDir, 'dist', 'seeds');

if (!existsSync(sourceDir)) {
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });
cpSync(sourceDir, targetDir, { recursive: true });
