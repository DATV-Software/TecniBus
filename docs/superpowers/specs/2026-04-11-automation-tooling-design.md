# Automation & Tooling Integration Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 3-layer quality gates (pre-commit local validation → `/commit` skill memory sync → pre-push structure validation → CI/CD remote validation) with manual deploy control. Memory auto-updates when code changes via `/commit` skill interaction with Claude.

**Architecture:** 
- **Layer 1 (Pre-commit hook)**: ESLint + TypeScript checks on staged files only (2 sec)
- **Layer 2 (/commit skill)**: Groups commits semantically + Claude validates memory alignment + auto-updates memory files (30 sec, interactive)
- **Layer 3 (Pre-push hook)**: Validates memory file structure + timestamps only (1 sec)
- **Layer 4 (GitHub Actions CI)**: Full test suite, ESLint, TypeScript, memory audit on all branches (5 min, no auto-deploy)
- **Manual Deploy**: Only when you merge develop → main, then `eas update` auto-runs

**Tech Stack:** Husky 9.0.0, GitHub Actions, Claude API (via `/commit` skill), ESLint 8.57.0, TypeScript 5.4.0, js-yaml 4.1.0, Node.js 20.x, EAS CLI

---

## 1. Architecture Overview

### Flow Diagram

```
Developer commits locally
  ↓
Pre-commit hook #1 (commit stage)
  ├── ESLint check
  ├── TypeScript type check
  └── Commit message format validation
  ↓ (if pass)
Developer pushes to any branch
  ↓
Pre-commit hook #2 (push stage)
  ├── /memory-audit skill validates (structure + content + integrity)
  └── Final gate before remote
  ↓ (if pass)
GitHub Actions (all branches)
  ├── Install dependencies
  ├── Run ESLint + TypeScript check
  ├── Run test suite
  ├── /memory-audit skill validates
  ├── Build artifact
  └── Report status
  ↓ (on main branch only, if all pass)
eas update (auto-deploy to preview)
  ↓
Merge to main + production update complete
```

### Four Layers of Validation

1. **Pre-commit (commit stage)**: ESLint + TypeScript on staged files only (2 sec). Fast feedback loop.
2. **Claude /commit skill (local, interactive)**: Groups commits semantically, validates memory alignment with code changes, auto-updates memory files if user confirms. This is where Claude ensures memory stays synchronized with implementation.
3. **Pre-push (push stage)**: Validates memory file structure (frontmatter, timestamps). Simple structural check, no intelligence needed.
4. **CI/CD (remote, all branches)**: Full suite (ESLint, TypeScript, tests, memory structure validation, build artifact). Acts as final gate before merge to main.

---

## 2. Pre-Commit Hooks Setup

### Files to Create/Modify

- Create: `.husky/pre-commit` — Runs ESLint + TypeScript check
- Create: `.husky/pre-push` — Runs /memory-audit skill
- Create: `scripts/validate-eslint.js` — ESLint validation wrapper
- Create: `scripts/validate-types.js` — TypeScript validation wrapper
- Modify: `package.json` — Add husky + pre-commit dependencies

### Commit Stage Hook (`.husky/pre-commit`)

Runs ESLint and TypeScript checks on staged files only. Fast, focused validation.

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running ESLint on staged files..."
node scripts/validate-eslint.js

if [ $? -ne 0 ]; then
  echo "❌ ESLint failed. Fix errors and try again."
  exit 1
fi

echo "✅ ESLint passed"

echo "🔍 Running TypeScript type check..."
node scripts/validate-types.js

if [ $? -ne 0 ]; then
  echo "❌ TypeScript check failed. Fix errors and try again."
  exit 1
fi

echo "✅ TypeScript check passed"
echo "✨ Pre-commit validation successful"
```

### Push Stage Hook (`.husky/pre-push`)

Validates memory file structure only (frontmatter + timestamps). Does NOT check memory alignment with code — that's done by `/commit` skill.

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Validating memory file structure before push..."

node scripts/memory-structure-check.js

if [ $? -ne 0 ]; then
  echo "❌ Memory structure validation failed. See issues above."
  exit 1
fi

echo "✅ Memory structure valid"
echo "✨ Ready to push"
```

### ESLint Validation Wrapper (`scripts/validate-eslint.js`)

Runs ESLint only on staged files (not entire codebase). Fast feedback loop.

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Get staged files
  const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
    .split('\n')
    .filter(file => file && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')))
    .filter(file => !file.startsWith('supabase/functions')); // Exclude edge functions

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
```

### TypeScript Validation Wrapper (`scripts/validate-types.js`)

Runs `tsc --noEmit` to validate types without compilation.

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  console.log('Checking TypeScript types...');
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  process.exit(0);
} catch (error) {
  process.exit(1);
}
```

---

## 3. GitHub Actions CI/CD Pipeline

### Files to Create

- Create: `.github/workflows/ci.yml` — Main CI pipeline (all branches)
- Create: `.github/workflows/deploy.yml` — Auto-deploy on main (eas update)

### CI Workflow (`.github/workflows/ci.yml`)

Runs on all branches: tests, lint, types, memory-audit, build artifact.

```yaml
name: CI

on:
  push:
    branches: [ main, develop, '**' ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [ 20.x ]

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for /memory-audit

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npx eslint . --ext .ts,.tsx --max-warnings 0

      - name: Run TypeScript check
        run: npx tsc --noEmit

      - name: Run tests
        run: npm test -- --coverage --passWithNoTests

      - name: Validate memory structure
        run: node scripts/memory-structure-check.js

      - name: Build artifact
        run: |
          echo "📦 Building artifact..."
          npm run build:web 2>/dev/null || echo "Web build not configured, skipping"

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: build-artifact-${{ github.ref_name }}
          path: dist/
          if-no-files-found: warn

      - name: Report Status
        if: always()
        run: |
          if [ "${{ job.status }}" = "success" ]; then
            echo "✅ CI passed for branch: ${{ github.ref_name }}"
          else
            echo "❌ CI failed for branch: ${{ github.ref_name }}"
            exit 1
          fi
```

### Deploy Workflow (`.github/workflows/deploy.yml`)

Auto-runs `eas update` when CI passes on main.

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: test  # Depends on CI job passing

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup EAS CLI
        run: npm install -g eas-cli

      - name: Deploy with eas update
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
        run: |
          echo "🚀 Deploying to production via eas update..."
          eas update --branch main --message "Auto-deploy from GitHub Actions" --skip-confirmation

      - name: Notify deployment
        run: |
          echo "✅ Deployment successful!"
          echo "📱 Production update deployed via eas update"
```

### Secrets Configuration

Repository needs these GitHub Secrets:
- `EXPO_TOKEN`: Expo authentication token (from `eas secret:create --scope project`)

---

## 4. Memory Management via `/commit` Skill & Pre-Push Validation

### Purpose

Memory stays synchronized with code through two mechanisms:

1. **`/commit` skill (interactive, with Claude)**: Analyzes code changes, detects memory misalignments, proposes updates, auto-applies when user confirms
2. **Pre-push structure validation (simple, no IA)**: Ensures memory files have valid frontmatter and recent timestamps before push

The intelligent sync happens in `/commit` skill (which you already use). The pre-push hook is just a safety check.

### Files to Create

- Create: `scripts/memory-structure-check.js` — Simple CLI tool (invoked by pre-push hook only)

### Memory Structure Validator (`scripts/memory-structure-check.js`)

Validates memory file structure ONLY (frontmatter + timestamps). No intelligent analysis — that's handled by `/commit` skill.

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const MEMORY_DIR = path.join(process.env.APPDATA || process.env.HOME, '.claude', 'projects', 'C--Users-diego-Desktop-tecnibus', 'memory');
const REQUIRED_FILES = [
  'user_profile.md',
  'tech_architecture.md',
  'project_state.md',
  'errors.md',
  'feedback_commits.md',
  'superpowers_workflows.md'
];

const MEMORY_INDEX = path.join(MEMORY_DIR, 'MEMORY.md');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: content };
  try {
    const fm = yaml.load(match[1]);
    return { frontmatter: fm, body: match[2] };
  } catch (e) {
    return { frontmatter: null, body: content, error: `Invalid YAML: ${e.message}` };
  }
}

function validateFile(filePath) {
  const issues = [];
  
  if (!fs.existsSync(filePath)) {
    return { missing: true, issues: [`File not found: ${filePath}`] };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { frontmatter, error } = parseFrontmatter(content);

  if (error) issues.push(error);

  // Structure validation only
  if (!frontmatter) {
    issues.push(`Missing frontmatter in ${path.basename(filePath)}`);
  } else {
    if (!frontmatter.name) issues.push(`Missing 'name' field in frontmatter`);
    if (!frontmatter.description) issues.push(`Missing 'description' field in frontmatter`);
    if (!frontmatter.type) issues.push(`Missing 'type' field in frontmatter`);
    if (!['user', 'feedback', 'project', 'reference'].includes(frontmatter.type)) {
      issues.push(`Invalid type: ${frontmatter.type}. Must be user|feedback|project|reference`);
    }
  }

  return { missing: false, issues };
}

function validateMemoryIndex() {
  const issues = [];

  if (!fs.existsSync(MEMORY_INDEX)) {
    return { missing: true, issues: [`MEMORY.md not found at ${MEMORY_INDEX}`] };
  }

  const content = fs.readFileSync(MEMORY_INDEX, 'utf-8');
  
  // Check all required files are referenced
  for (const file of REQUIRED_FILES) {
    if (!content.includes(`[${file.replace('.md', '')}]`) && !content.includes(file)) {
      issues.push(`MEMORY.md does not reference ${file}`);
    }
  }

  // Check no dead links
  const linkMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  for (const match of linkMatches) {
    const linkMatch = match.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const linkedFile = path.join(MEMORY_DIR, linkMatch[2]);
      if (!fs.existsSync(linkedFile)) {
        issues.push(`Dead link in MEMORY.md: ${linkMatch[2]}`);
      }
    }
  }

  return { missing: false, issues };
}

function runCheck() {
  console.log(`🔍 Validating memory file structure...\n`);

  let totalIssues = 0;

  // Validate each file
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(MEMORY_DIR, file);
    const result = validateFile(filePath);

    if (result.missing) {
      console.log(`❌ ${file}: MISSING`);
      totalIssues++;
    } else if (result.issues.length > 0) {
      console.log(`⚠️  ${file}: ${result.issues.length} issue(s)`);
      result.issues.forEach(issue => console.log(`   → ${issue}`));
      totalIssues += result.issues.length;
    } else {
      console.log(`✅ ${file}: OK`);
    }
  }

  console.log('');

  // Validate MEMORY.md index
  const indexResult = validateMemoryIndex();
  if (indexResult.missing) {
    console.log(`❌ MEMORY.md: MISSING`);
    totalIssues++;
  } else if (indexResult.issues.length > 0) {
    console.log(`⚠️  MEMORY.md: ${indexResult.issues.length} issue(s)`);
    indexResult.issues.forEach(issue => console.log(`   → ${issue}`));
    totalIssues += indexResult.issues.length;
  } else {
    console.log(`✅ MEMORY.md: OK`);
  }

  console.log(`\n${'='.repeat(50)}`);
  if (totalIssues === 0) {
    console.log(`✅ Memory structure validation PASSED\n`);
    process.exit(0);
  } else {
    console.log(`❌ Memory structure validation FAILED (${totalIssues} issue(s))\n`);
    process.exit(1);
  }
}

runCheck();
```

---

## 5. Package.json & Dependencies

### Dependencies to Add

```json
{
  "devDependencies": {
    "husky": "^9.0.0",
    "eslint": "^8.57.0",
    "typescript": "^5.4.0",
    "js-yaml": "^4.1.0"
  },
  "scripts": {
    "prepare": "husky install",
    "lint": "eslint . --ext .ts,.tsx --max-warnings 0",
    "type-check": "tsc --noEmit",
    "test": "jest --passWithNoTests",
    "memory:check": "node scripts/memory-structure-check.js"
  }
}
```

### Setup Commands

```bash
npm install husky js-yaml --save-dev
npx husky install
npx husky add .husky/pre-commit "node scripts/validate-eslint.js"
npx husky add .husky/pre-push "node scripts/memory-structure-check.js"
```

---

## 6. Integration Points

### When Pre-Commit Hook Runs

1. **Developer runs**: `git commit -m "message"`
2. **Pre-commit hook triggers**:
   - ESLint on staged files → if fail, abort commit
   - TypeScript type check → if fail, abort commit
3. **If pass**: Commit succeeds

### When Pre-Push Hook Runs

1. **Developer runs**: `git push`
2. **Pre-push hook triggers**:
   - `/memory-audit` validates memory files
3. **If fail**: Push aborted
4. **If pass**: Push proceeds to remote

### When GitHub Actions Runs

1. **Push lands on any branch** (develop, main, feature/*)
2. **CI workflow executes**:
   - ESLint + TypeScript (full codebase)
   - Test suite
   - `/memory-audit` validation
   - Build artifact
3. **On main branch only** (if all pass):
   - Deploy workflow triggers
   - `eas update` runs automatically

### CI/CD Status Visibility

- GitHub shows workflow status on PRs and commits
- Failed jobs block merge (enforce quality gates)
- Artifacts available for download

---

## 7. Error Handling & Recovery

### Pre-Commit Hook Fails

```bash
git commit -m "message"
→ ESLint error: 269 console.log statements
→ Hook aborts with error message
→ Developer fixes: delete console logs
→ git commit --amend (or new commit)
→ Hook runs again
```

### Pre-Push Hook Fails

```bash
git push
→ /memory-audit error: "errors.md timestamp is 45 days old"
→ Hook aborts
→ Developer updates timestamp in errors.md
→ git add .claude/...  (or skip if not tracking)
→ git push (retry)
```

### GitHub Actions Fails

```
Push to main
→ CI workflow fails: TypeScript error
→ GitHub shows ❌ on commit
→ Developer fixes locally
→ git push again
→ CI runs again
→ If pass: Deploy workflow auto-triggers
```

---

## 8. Testing the Integration

### Local Testing (Before Pushing)

```bash
# Test pre-commit hook
echo "console.log('test')" >> app/login.tsx
git add app/login.tsx
git commit -m "test: add console" # Should fail

# Test pre-push hook
git branch test-branch
git checkout test-branch
echo "test" >> .claude/.../test.md
git add .
git commit -m "test: memory file"
git push # Should fail (memory-audit)
```

### GitHub Actions Testing

Push to a feature branch and observe workflow execution on GitHub Actions tab.

---

## 9. Success Criteria

✅ Pre-commit hook catches ESLint errors before commit
✅ Pre-push hook validates memory consistency before push
✅ GitHub Actions CI passes on all branches
✅ GitHub Actions auto-deploys via `eas update` on main only
✅ Failed checks block pushes (pre-push hook) and merges (GitHub Actions)
✅ `/memory-audit` runs consistently (local + CI)
✅ Developers see clear error messages at each gate
✅ No manual build/deploy needed for preview (eas update is automatic)

---

## 10. Timeline & Dependencies

**Phase 1 (Pre-commit hooks):** 1-2 hours
- Husky setup
- ESLint + TypeScript validation scripts
- Test locally

**Phase 2 (GitHub Actions):** 2-3 hours
- CI workflow
- Deploy workflow
- Secrets configuration

**Phase 3 (`/memory-audit` skill):** 1-2 hours
- CLI tool implementation
- Integration with hooks + CI/CD
- Testing

**Total:** 4-7 hours for full integration (can be parallelized with subagents)

---

**Design Status:** Ready for implementation
**Last Updated:** 2026-04-11
**Spec Author:** Claude (Brainstorming Skill)
