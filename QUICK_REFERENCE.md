# Quick Reference Card

## Before Every Commit

```bash
npx tsc --noEmit 2>&1   # Type check (0 errors required)
npm run build            # Build verification
npx eslint src          # Code quality check
```

**If any fails:** Don't commit! Fix errors first.

---

## Before Deploying to Production

```bash
# Final checks
npm run preview         # Test production mode
# Visit GitHub Actions: https://github.com/dhruvinrsoni/samvada-studio/actions
# All checks must show ✅
```

**Use:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

## Common Error Fixes

| Error | Fix |
|-------|-----|
| "Cannot read property X of undefined" | Use `?.` optional chaining |
| "X is not defined" | Check type exists before accessing |
| "X might be undefined" | Add `?? defaultValue` nullish coalescing |
| "useEffect must return void" | Add explicit `return cleanup()` |
| "X is unused" | Remove unused variable or add `_` prefix |

**Full guide:** [DEVELOPMENT_GUIDELINES.md](DEVELOPMENT_GUIDELINES.md)

---

## GitHub Actions Status

Check: https://github.com/dhruvinrsoni/samvada-studio/actions

- ✅ = All checks passed, ready to deploy
- ❌ = Fix errors before deploying

**What it checks:**
1. TypeScript (npx tsc --noEmit)
2. Build (npm run build)
3. ESLint (code style)
4. Production strict check (for main branch)

---

## Error Recovery

**In Development (npm run dev):**
- Shows full error stack trace
- Shows file name and line number
- Easy to debug

**In Production (npm run preview / deployed):**
- Shows user-friendly message
- Hides technical details
- Provides recovery options (reload, go home, clear cache)

**How it works:** ErrorBoundary component catches errors automatically

---

## Key Files

| File | Purpose | When to Use |
|------|---------|-----------|
| `DEVELOPMENT_GUIDELINES.md` | Development best practices | Every commit |
| `DEPLOYMENT_CHECKLIST.md` | Production deployment steps | Before deploying |
| `ERROR_HANDLING_GUIDE.md` | Error handling patterns | Writing error-prone code |
| `PRODUCTION_SAFETY_SUMMARY.md` | Complete overview | Reference guide |
| `.github/workflows/test.yml` | CI/CD automation | Automatic (no action needed) |

---

## Git Workflow

```bash
# 1. Create branch
git checkout -b feature/my-feature

# 2. Edit code
# ... make changes ...

# 3. Run checks
npx tsc --noEmit 2>&1
npm run build

# 4. Commit if checks pass
git add .
git commit -m "feat: my feature"
git push origin feature/my-feature

# 5. GitHub Actions runs automatically
# If ✅ green: PR ready to merge
# If ❌ red: Fix and push again

# 6. Merge to main after approval
# GitHub Actions will run one more time on main
# If ✅ green: Ready to deploy
```

---

## Emergency Rollback

```bash
# If something goes wrong in production:

# 1. Find last good commit
git log --oneline | head -5

# 2. Revert to it
git revert HEAD

# 3. Push immediately
git push origin main

# 4. Wait for GitHub Actions (2 min)
# 5. All checks pass ✅
# 6. Production back to working state
```

See: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md#rollback-plan-if-issues-found)

---

## Team Communication

**When submitting PR:**
- ✅ "GitHub Actions checks all passed"
- ✅ "No TypeScript errors"
- ✅ "Tested in production mode"

**When deploying:**
- ✅ "All GitHub Actions ✅"
- ✅ "Deployment checklist verified"
- ✅ "Ready for production"

---

## Need Help?

| Question | Answer | Link |
|----------|--------|------|
| What's GitHub Actions? | Automated testing system | DEVELOPMENT_GUIDELINES.md § 1 |
| Why deployments failed before | No automation, manual testing | DEVELOPMENT_GUIDELINES.md § 1 |
| How to fix TypeScript errors | 7 common patterns + fixes | DEVELOPMENT_GUIDELINES.md § 2 |
| What to do before deploying | Complete checklist | DEPLOYMENT_CHECKLIST.md |
| How error handling works | Full guide with examples | ERROR_HANDLING_GUIDE.md |

---

## One-Time Setup: DONE ✅

- ✅ Fixed all 56 TypeScript errors
- ✅ Created GitHub Actions workflow
- ✅ Enabled strict TypeScript mode
- ✅ Integrated ErrorBoundary
- ✅ Created documentation
- ✅ Created checklists

**You don't need to set anything up again.** Just follow the checklist before each commit and deploy!

---

**Status:** Production-Ready ✅
**Errors:** 0 TypeScript errors ✅
**Automation:** GitHub Actions active ✅
**Documentation:** Complete ✅
