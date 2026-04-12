#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  // Get staged files
  const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
    .split('\n')
    .filter(file => file && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')))
    .filter(file => !file.startsWith('supabase/functions'));

  if (stagedFiles.length === 0) {
    console.log('No TypeScript/JavaScript files staged. Skipping ESLint.');
    process.exit(0);
  }

  // Run ESLint on staged files
  const command = `npx eslint ${stagedFiles.join(' ')} --max-warnings 0`;
  execSync(command, { stdio: 'inherit' });

  process.exit(0);
} catch (error) {
  process.exit(1);
}
