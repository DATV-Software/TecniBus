#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  // Get staged files (excluding deleted files)
  const stagedFiles = execSync('git diff --cached --diff-filter=ACMRU --name-only', { encoding: 'utf-8' })
    .split('\n')
    .filter(file => file && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')))
    .filter(file => !file.startsWith('supabase/functions'));

  if (stagedFiles.length === 0) {
    console.log('No TypeScript/JavaScript files staged. Skipping ESLint.');
    process.exit(0);
  }

  // Run ESLint on staged files (blocking — 0 warnings policy)
  try {
    execSync(`npx eslint ${stagedFiles.join(' ')} --max-warnings 0`, { stdio: 'inherit' });
  } catch (_) {
    console.log('\n❌ ESLint failed. Fix all errors/warnings before committing.');
    process.exit(1);
  }

  process.exit(0);
} catch (_) {
  process.exit(1);
}
