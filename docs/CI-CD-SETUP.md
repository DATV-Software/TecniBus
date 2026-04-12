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

**Setup Complete**: 2026-04-12
**Maintained by**: Diego
