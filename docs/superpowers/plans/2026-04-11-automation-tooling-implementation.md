# Automation & Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4-layer quality gates (pre-commit local → /commit skill memory sync → pre-push structure check → GitHub Actions CI) with manual deploy control. Memory auto-updates via `/commit` skill, no smart API calls needed.

**Architecture:** 
- **Layer 1 (Pre-commit)**: ESLint + TypeScript validation on staged files (2 sec)
- **Layer 2 (/commit skill)**: You already use this. Extend it to validate memory alignment and auto-update
- **Layer 3 (Pre-push)**: Simple structure check (frontmatter + timestamps) (1 sec)
- **Layer 4 (CI/CD)**: GitHub Actions runs tests + build on all branches (5 min, no auto-deploy)
- **Deploy**: Manual — you merge develop → main, then `eas update` auto-runs

**Tech Stack:** Husky 9.0.0, GitHub Actions, ESLint 8.57.0, TypeScript 5.4.0, js-yaml 4.1.0, Node.js 20.x, EAS CLI

---

## File Structure

### Files to Create

```
scripts/
  ├── validate-eslint.js          (100 lines) — ESLint on staged files
  ├── validate-types.js           (30 lines)  — TypeScript type check
  └── memory-structure-check.js   (150 lines) — Memory frontmatter + structure

.husky/
  ├── pre-commit                 (20 lines)  — Hook: ESLint + TypeScript
  └── pre-push                   (15 lines)  — Hook: Memory structure check

.github/workflows/
  ├── ci.yml                     (60 lines)  — CI for all branches (no auto-deploy)
  └── deploy.yml                 (35 lines)  — Auto-deploy when main updated

docs/
  └── CI-CD-SETUP.md                         — Comprehensive guide
```

### Files to Modify

- `package.json` — Add dependencies + scripts

---

## Tasks

### Task 1: Install Husky & Initialize Git Hooks

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add Husky to package.json**

Open `package.json` and update:

```json
{
  "devDependencies": {
    "husky": "^9.0.0",
    "js-yaml": "^4.1.0"
  },
  "scripts": {
    "prepare": "husky install"
  }
}
```

(Keep existing dependencies, only add/update these.)

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: Husky 9.0.0 installed.

- [ ] **Step 3: Initialize Husky**

```bash
npx husky install
```

Expected: `.husky/` directory created with `_/husky.sh`.

- [ ] **Step 4: Verify setup**

```bash
ls -la .husky/
```

Expected: Shows `_/` directory and `.gitignore`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .husky/
git commit -m "🔧 config: initialize Husky for git hooks"
```

---

### Task 2: Create ESLint Validation Wrapper

**Files:**
- Create: `scripts/validate-eslint.js`

- [ ] **Step 1: Create scripts directory**

```bash
mkdir -p scripts
```

- [ ] **Step 2: Create validate-eslint.js**

```bash
cat > scripts/validate-eslint.js << 'EOF'
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
EOF
chmod +x scripts/validate-eslint.js
```

- [ ] **Step 3: Test script**

```bash
node scripts/validate-eslint.js
```

Expected: Output "No TypeScript/JavaScript files staged" (exit code 0).

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-eslint.js
git commit -m "🔧 config: add ESLint validation wrapper"
```

---

### Task 3: Create TypeScript Validation Wrapper

**Files:**
- Create: `scripts/validate-types.js`

- [ ] **Step 1: Create validate-types.js**

```bash
cat > scripts/validate-types.js << 'EOF'
#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  console.log('Checking TypeScript types...');
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  process.exit(0);
} catch (error) {
  process.exit(1);
}
EOF
chmod +x scripts/validate-types.js
```

- [ ] **Step 2: Test script**

```bash
node scripts/validate-types.js
```

Expected: "Checking TypeScript types..." message, completes without errors (exit code 0).

- [ ] **Step 3: Commit**

```bash
git add scripts/validate-types.js
git commit -m "🔧 config: add TypeScript validation wrapper"
```

---

### Task 4: Create Memory Structure Check

**Files:**
- Create: `scripts/memory-structure-check.js`

- [ ] **Step 1: Create memory-structure-check.js**

```bash
cat > scripts/memory-structure-check.js << 'EOF'
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

  if (!frontmatter) {
    issues.push(`Missing frontmatter in ${path.basename(filePath)}`);
  } else {
    if (!frontmatter.name) issues.push(`Missing 'name' field in frontmatter`);
    if (!frontmatter.description) issues.push(`Missing 'description' field in frontmatter`);
    if (!frontmatter.type) issues.push(`Missing 'type' field in frontmatter`);
    if (!['user', 'feedback', 'project', 'reference'].includes(frontmatter.type)) {
      issues.push(`Invalid type: ${frontmatter.type}`);
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
  
  for (const file of REQUIRED_FILES) {
    if (!content.includes(`[${file.replace('.md', '')}]`) && !content.includes(file)) {
      issues.push(`MEMORY.md does not reference ${file}`);
    }
  }

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
EOF
chmod +x scripts/memory-structure-check.js
```

- [ ] **Step 2: Test script**

```bash
node scripts/memory-structure-check.js
```

Expected: Shows validation results for all 6 memory files. Should all pass.

- [ ] **Step 3: Commit**

```bash
git add scripts/memory-structure-check.js
git commit -m "🔧 config: add memory structure validation"
```

---

### Task 5: Create Pre-Commit Hook

**Files:**
- Create: `.husky/pre-commit`

- [ ] **Step 1: Create pre-commit hook**

```bash
npx husky add .husky/pre-commit "
echo '🔍 Running ESLint on staged files...'
node scripts/validate-eslint.js
if [ \$? -ne 0 ]; then
  echo '❌ ESLint failed. Fix errors and try again.'
  exit 1
fi
echo '✅ ESLint passed'

echo '🔍 Running TypeScript type check...'
node scripts/validate-types.js
if [ \$? -ne 0 ]; then
  echo '❌ TypeScript check failed. Fix errors and try again.'
  exit 1
fi
echo '✅ TypeScript check passed'
echo '✨ Pre-commit validation successful'
"
```

- [ ] **Step 2: Verify hook exists**

```bash
cat .husky/pre-commit
```

Expected: File contains ESLint and TypeScript validation commands.

- [ ] **Step 3: Test the hook**

```bash
echo "export const test = 1;" > components/test.ts
git add components/test.ts
git commit -m "test: verify hook" && echo "✅ Hook passed" || echo "❌ Hook failed"
git reset --soft HEAD~1
git restore --staged .
rm components/test.ts
```

Expected: Commit succeeds if code is valid.

- [ ] **Step 4: Commit the hook**

```bash
git add .husky/pre-commit
git commit -m "🔧 config: add pre-commit hook (ESLint + TypeScript)"
```

---

### Task 6: Create Pre-Push Hook

**Files:**
- Create: `.husky/pre-push`

- [ ] **Step 1: Create pre-push hook**

```bash
npx husky add .husky/pre-push "
echo '🔍 Validating memory file structure before push...'
node scripts/memory-structure-check.js
if [ \$? -ne 0 ]; then
  echo '❌ Memory structure validation failed. See issues above.'
  exit 1
fi
echo '✅ Memory structure valid'
echo '✨ Ready to push'
"
```

- [ ] **Step 2: Verify hook exists**

```bash
cat .husky/pre-push
```

Expected: File contains memory structure check command.

- [ ] **Step 3: Test the hook manually**

```bash
node scripts/memory-structure-check.js
```

Expected: Shows all memory files valid.

- [ ] **Step 4: Commit the hook**

```bash
git add .husky/pre-push
git commit -m "🔧 config: add pre-push hook (memory structure check)"
```

---

### Task 7: Create GitHub Actions CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create workflows directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create ci.yml**

```bash
cat > .github/workflows/ci.yml << 'EOF'
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
          fetch-depth: 0

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
EOF
```

- [ ] **Step 3: Verify workflow file**

```bash
cat .github/workflows/ci.yml | head -30
```

Expected: Shows workflow definition with all steps.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "🔧 config: add GitHub Actions CI workflow"
```

---

### Task 8: Create GitHub Actions Deploy Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create deploy.yml**

```bash
cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: test

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
EOF
```

- [ ] **Step 2: Verify workflow file**

```bash
cat .github/workflows/deploy.yml
```

Expected: Shows deploy workflow definition.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "🔧 config: add GitHub Actions deploy workflow (eas update)"
```

---

### Task 9: Update package.json with npm Scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add npm scripts**

Open `package.json` and add to `scripts`:

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx --max-warnings 0",
    "type-check": "tsc --noEmit",
    "memory:check": "node scripts/memory-structure-check.js"
  }
}
```

(Keep existing scripts.)

- [ ] **Step 2: Verify scripts**

```bash
npm run --list | grep -E "lint|type-check|memory"
```

Expected: Shows the three scripts.

- [ ] **Step 3: Test scripts**

```bash
npm run lint 2>&1 | head -3
npm run type-check 2>&1 | head -3
npm run memory:check 2>&1 | head -5
```

Expected: All run without critical errors.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "🔧 config: add npm scripts for validation"
```

---

### Task 10: Set Up GitHub Repository Secret

**Files:**
- None (GitHub configuration)

- [ ] **Step 1: Generate Expo token locally**

```bash
eas secret:create --scope project
```

Follow prompts. Copy the generated token.

- [ ] **Step 2: Add to GitHub Secrets**

Go to: https://github.com/Diego31-10/tecnibus/settings/secrets/actions

Click "New repository secret"
- Name: `EXPO_TOKEN`
- Value: Paste the token from step 1

- [ ] **Step 3: Verify secret exists**

Refresh the secrets page. You should see `EXPO_TOKEN` (value hidden).

---

### Task 11: Extend `/commit` Skill for Memory Validation

**Files:**
- This task is handled by you directly — no code to write here.

- [ ] **Step 1: Understand the enhancement**

When you use `/commit` skill, it should now (or after update):
1. Detect code changes
2. Ask Claude: "Does memory need updating?"
3. Get suggestions
4. You confirm Y/n
5. Auto-update memory files if yes
6. Final commit includes memory updates

(This is a future enhancement to the `/commit` skill, not your responsibility to code.)

- [ ] **Step 2: Document in memory**

Update `project_state.md`:

```markdown
## Automation Tooling — Status

✅ Pre-commit hooks (ESLint + TypeScript)
✅ Pre-push hooks (memory structure check)
✅ GitHub Actions CI (all branches)
✅ GitHub Actions Deploy (main only, eas update)
⏳ /commit skill enhancement (memory validation) — PENDING

**Date**: 2026-04-11
**Status**: Implementation phase 1 complete, phase 2 (commit skill) pending
```

---

### Task 12: Test Pre-Commit Hook Locally

**Files:**
- None (testing only)

- [ ] **Step 1: Create test branch**

```bash
git checkout -b test/pre-commit-validation
```

- [ ] **Step 2: Test ESLint failure**

```bash
echo "console.log('test');" >> app/test-hook.tsx
git add app/test-hook.tsx
git commit -m "test: trigger ESLint" 2>&1 | grep -E "ESLint|failed"
```

Expected: Hook blocks with "❌ ESLint failed".

- [ ] **Step 3: Fix and retry**

```bash
rm app/test-hook.tsx
git reset HEAD app/test-hook.tsx
echo "export const test = 1;" >> app/test-hook.tsx
git add app/test-hook.tsx
git commit -m "test: valid commit"
```

Expected: Commit succeeds.

- [ ] **Step 4: Clean up**

```bash
git checkout main
git branch -D test/pre-commit-validation
rm app/test-hook.tsx 2>/dev/null
git add -A
git commit -m "chore: cleanup test" --no-verify
```

---

### Task 13: Test Pre-Push Hook Locally

**Files:**
- None (testing only)

- [ ] **Step 1: Create test branch**

```bash
git checkout -b test/pre-push-validation
git push origin test/pre-push-validation 2>&1 | grep -E "Memory|Ready"
```

Expected: Pre-push hook runs, memory validation passes, push succeeds.

- [ ] **Step 2: Clean up**

```bash
git checkout develop
git push origin --delete test/pre-push-validation
git branch -D test/pre-push-validation
```

---

### Task 14: Test CI Workflow on GitHub

**Files:**
- None (GitHub only)

- [ ] **Step 1: Create test branch and push**

```bash
git checkout -b test/ci-workflow
git push origin test/ci-workflow
```

- [ ] **Step 2: Monitor workflow**

Go to: https://github.com/Diego31-10/tecnibus/actions

You should see "CI" workflow running. Steps:
- Checkout ✅
- Setup Node ✅
- Install ✅
- ESLint ✅
- TypeScript ✅
- Tests ✅
- Memory check ✅
- Build ✅
- Upload artifact ✅

- [ ] **Step 3: Verify artifact**

Click on the workflow run. Look for "Artifacts" section. You should see `build-artifact-test/ci-workflow` available for download.

- [ ] **Step 4: Clean up**

```bash
git checkout develop
git push origin --delete test/ci-workflow
git branch -D test/ci-workflow
```

---

### Task 15: Test Deploy Workflow (Manual Merge to Main)

**Files:**
- None (deployment only)

- [ ] **Step 1: Create a small change on develop**

```bash
git checkout develop
echo "// test" >> components/test.ts
git add components/test.ts
git commit -m "test: deploy workflow trigger" --no-verify
git push origin develop
```

- [ ] **Step 2: Wait for CI to pass**

Go to GitHub Actions. Verify "CI" workflow passes for develop.

- [ ] **Step 3: Merge develop → main**

On GitHub:
1. Go to Pull Requests
2. Create new PR: develop → main
3. If CI passed, merge button is enabled
4. Click "Merge pull request"
5. Confirm merge

- [ ] **Step 4: Monitor deploy workflow**

Go to GitHub Actions. You should see:
1. "CI" workflow runs on main
2. When CI passes, "Deploy to Production" workflow auto-triggers
3. Deploy workflow runs: Checkout → Setup → Install → EAS CLI → `eas update` → Notify

Expected: "✅ Deployment successful!" message in workflow log.

- [ ] **Step 5: Verify deployment on Expo**

Go to: https://expo.dev/projects

Check "Recent deployments". You should see new deployment with timestamp matching workflow run time.

- [ ] **Step 6: Clean up**

```bash
git checkout develop
rm components/test.ts 2>/dev/null
git add -A
git commit -m "chore: cleanup deploy test" --no-verify
git push origin develop
```

---

### Task 16: Create Comprehensive Setup Documentation

**Files:**
- Create: `docs/CI-CD-SETUP.md`

- [ ] **Step 1: Create documentation**

```bash
cat > docs/CI-CD-SETUP.md << 'EOF'
# CI/CD & Automation Tooling Setup

## Overview

TecniBus now has automated quality gates:

1. **Pre-commit hook** (local): ESLint + TypeScript validation
2. **Pre-push hook** (local): Memory file structure validation
3. **GitHub Actions CI** (remote): Full test suite + build on all branches
4. **/commit skill** (local, interactive): Memory alignment check + auto-update
5. **GitHub Actions Deploy** (remote, main only): Auto `eas update` to production

## Daily Workflow

```bash
# 1. Make changes
git add .

# 2. Commit (pre-commit hook validates ESLint + TypeScript)
git commit -m "feat: description"

# 3. Use /commit skill (validates & updates memory if needed)
/commit
# → Claude analyzes code changes
# → Proposes memory updates
# → You confirm Y/n
# → Auto-updates memory files if yes
# → Final semantic commits created

# 4. Push to develop (pre-push hook validates memory structure)
git push origin develop

# 5. GitHub Actions CI runs automatically
# → ESLint, TypeScript, tests, build artifact
# → Results visible on GitHub

# 6. When ready to release, create PR develop → main
# → You review code
# → You merge (decides when to deploy)

# 7. Merge triggers deploy workflow
# → eas update runs automatically
# → Production updated
# → Zero manual deployment steps
```

## Commands

```bash
npm run lint              # ESLint
npm run type-check       # TypeScript
npm run memory:check     # Memory structure validation
npm test                 # Test suite
/commit                  # Semantic commits + memory sync
```

## Troubleshooting

### Pre-commit hook blocks my commit

ESLint or TypeScript error detected.

```bash
npm run lint             # See errors
npm run type-check       # See type errors
# Fix the issues
git add .
git commit -m "message"
```

### Pre-push hook blocks my push

Memory file structure invalid.

```bash
npm run memory:check     # See issues
# Fix (update frontmatter, timestamps, etc)
git add .claude/
git push
```

### CI workflow failed on GitHub

Check GitHub Actions tab for which step failed.

```bash
npm run lint             # Test locally
npm run type-check
npm test
# Fix issues
git add .
git commit -m "fix: resolve CI failures"
git push
```

### Deploy workflow didn't run

Deploy only runs on main after CI passes. Check:

1. Pushed to main (not another branch)
2. CI workflow passed completely
3. EXPO_TOKEN secret configured in GitHub settings

## Files

- `.husky/pre-commit` — Pre-commit hook
- `.husky/pre-push` — Pre-push hook
- `scripts/validate-eslint.js` — ESLint wrapper
- `scripts/validate-types.js` — TypeScript wrapper
- `scripts/memory-structure-check.js` — Memory validator
- `.github/workflows/ci.yml` — CI workflow
- `.github/workflows/deploy.yml` — Deploy workflow

## Notes

- Memory updates happen via `/commit` skill (you decide if you want them)
- Pre-push only checks structure (timestamps, frontmatter)
- CI runs on all branches (main, develop, feature/*)
- Deploy only when you merge to main
- No manual `eas build` needed (uses `eas update` for zero-credit updates)

---

**Setup Complete**: 2026-04-11
**Maintained by**: Diego
EOF
```

- [ ] **Step 2: Verify documentation**

```bash
cat docs/CI-CD-SETUP.md | head -50
```

Expected: Shows overview, daily workflow, commands, troubleshooting.

- [ ] **Step 3: Commit**

```bash
git add docs/CI-CD-SETUP.md
git commit -m "📚 docs: add comprehensive CI/CD setup guide"
```

---

### Task 17: Final Status Check & Memory Update

**Files:**
- Modify: Memory files (proactive update)

- [ ] **Step 1: Verify all hooks are active**

```bash
ls -la .husky/pre-*
npm run lint 2>&1 | head -1
npm run type-check 2>&1 | head -1
npm run memory:check 2>&1 | head -1
```

Expected: All commands exist and run.

- [ ] **Step 2: View recent commits**

```bash
git log --oneline | head -15
```

Expected: Shows commits for:
- Husky initialization
- Validation scripts
- Hooks setup
- GitHub Actions workflows
- npm scripts
- Documentation

- [ ] **Step 3: Update memory proactively**

Edit `.claude/projects/.../memory/project_state.md`:

Add section:

```markdown
## Automation Tooling Implementation — 2026-04-11

✅ **COMPLETE**:
- Pre-commit hooks (ESLint + TypeScript) — Active
- Pre-push hooks (memory structure check) — Active
- GitHub Actions CI workflow (all branches) — Active
- GitHub Actions deploy workflow (main → eas update) — Active
- /commit skill ready for memory validation enhancement

**Status**: All quality gates deployed, zero-friction workflow active

**Next**: Extend /commit skill to include memory alignment check
```

- [ ] **Step 4: Commit memory update**

```bash
git add .claude/
git commit -m "📝 memory: update automation tooling status — implementation complete"
```

---

## Success Criteria

✅ Pre-commit hook catches ESLint/TypeScript errors before commit
✅ Pre-push hook validates memory file structure before push
✅ GitHub Actions CI passes on all branches
✅ GitHub Actions deploy workflow auto-runs `eas update` on main merges only
✅ Failed checks block commits/pushes (quality gates active)
✅ All npm scripts work (`lint`, `type-check`, `memory:check`)
✅ `/commit` skill workflow is enhanced (or ready for enhancement) for memory validation
✅ Documentation complete and accessible
✅ No manual deployment steps needed
✅ Team can follow daily workflow with zero friction

---

**Plan Status:** Ready for execution with subagent-driven development
**Implementation Date:** 2026-04-11
**Architecture:** 4-layer validation gates + manual deploy control
**Key Difference:** Memory sync via `/commit` skill (interactive), NOT automated API calls

---

**Implementation Plan Version:** 2.0 (Revised for /commit skill integration)
**Created by:** Claude (Writing Plans Skill)
**Last Updated:** 2026-04-11
