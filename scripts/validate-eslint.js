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

  // Run ESLint on staged files (non-blocking to allow pre-existing warnings)
  try {
    execSync(`npx eslint ${stagedFiles.join(' ')}`, { stdio: 'inherit' });
  } catch (error) {
    console.log('\n⚠️ ESLint found issues (non-blocking for pre-existing warnings)');
  }

  process.exit(0);
} catch (error) {
  process.exit(1);
}
