#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  console.log('Checking TypeScript types...');
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  process.exit(0);
} catch (error) {
  process.exit(1);
}
