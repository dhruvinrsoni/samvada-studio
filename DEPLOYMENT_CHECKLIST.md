# Production Deployment Checklist

Use this checklist before every production deployment. **Do not skip any item.**

---

## Pre-Deployment Checks (Run Locally)

### Code Quality
- [ ] `npx tsc --noEmit 2>&1` returns **0 errors** (not warnings)
- [ ] `npm run build` completes successfully
- [ ] `npx eslint src` passes (max 10 warnings acceptable)
- [ ] No `console.error()` or `console.warn()` left in code
- [ ] No `// TODO` or `// FIXME` comments blocking deployment

### TypeScript Strict Mode
- [ ] All optional values checked with `?.` or nullish coalescing `??`
- [ ] No `any` types in new code
- [ ] All function returns are typed (void, cleanup function, etc.)
- [ ] Array access always has bounds check or default value

### Testing
- [ ] Manually tested in development mode (`npm run dev`)
- [ ] Manually tested in production mode (`npm run preview`)
- [ ] Tested all new features in both modes
- [ ] Tested on mobile device (not just desktop)
- [ ] Tested error scenarios (network down, API failure, bad input)

### Browser Compatibility
- [ ] Tested in Chrome/Edge (Chromium)
- [ ] Tested in Firefox
- [ ] Tested in Safari (if possible)
- [ ] No console errors in any browser
- [ ] No console warnings that affect UX

### Performance
- [ ] App loads in < 3 seconds on 4G
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] No unnecessary re-renders (React DevTools Profiler)
- [ ] Images optimized (< 100KB total for above-fold)

---

## GitHub Actions Verification

### Automated Checks
- [ ] All GitHub Actions workflows show ✅ (green checkmarks)
- [ ] Type Check: ✅ passed
- [ ] Build: ✅ passed  
- [ ] ESLint: ✅ passed
- [ ] Pre-deployment (strict check): ✅ passed
- [ ] Go to: https://github.com/dhruvinrsoni/samvada-studio/actions

### If Any Check Failed
- [ ] Do NOT deploy
- [ ] Pull latest code: `git pull origin`
- [ ] Fix errors locally: `npx tsc --noEmit 2>&1`
- [ ] Commit and push fix
- [ ] Wait for GitHub Actions to re-run (5-10 minutes)
- [ ] All checks must pass ✅ before proceeding

---

## Error Handling Verification

### ErrorBoundary Coverage
- [ ] ErrorBoundary wraps: Sidebar
- [ ] ErrorBoundary wraps: Chat Area
- [ ] ErrorBoundary wraps: Context Panel
- [ ] ErrorBoundary wraps: All modals (Admin, Search, Commands, etc.)
- [ ] Test by throwing error in browser console: `throw new Error('test')`
  - Should see error UI, not white screen

### Production Error Messages
- [ ] Error messages do NOT contain:
  - [ ] Full stack traces
  - [ ] Internal file paths
  - [ ] Database connection strings
  - [ ] API keys or secrets
- [ ] Error messages are user-friendly:
  - [ ] "Something went wrong" not "Cannot read property 'x' of undefined"
  - [ ] Recovery options: Reload, Go Home, Clear Cache
  - [ ] Professional tone and formatting

### Console Check
- [ ] Open DevTools (F12) → Console tab
- [ ] No red errors should appear
- [ ] No sensitive data in logs
- [ ] All messages are debug/info level (not error/warn)

---

## Environment & Configuration

### Environment Variables
- [ ] All required env vars are set
- [ ] No `.env` file committed to git
- [ ] `.env.example` updated if new vars added
- [ ] Prod database/API endpoints are correct
- [ ] No dev URLs pointing to production config

### Build Configuration
- [ ] `tsconfig.json` has `"strict": true` enabled
- [ ] `vite.config.ts` has correct build output path
- [ ] Source maps disabled for production (smaller bundle)
- [ ] PWA manifest correct (manifest.webmanifest)
- [ ] Robots.txt configured for SEO

### Security
- [ ] No hardcoded API keys or secrets
- [ ] CORS headers are restrictive (not `*`)
- [ ] CSP headers configured
- [ ] No sensitive data in localStorage (use secure storage)
- [ ] All API calls use HTTPS (not HTTP)

---

## Deployment Process

### Pre-Merge
- [ ] Create pull request (GitHub)
- [ ] All GitHub Actions checks pass ✅
- [ ] Code review approved (if required)
- [ ] All comments resolved

### Merge to Production
```bash
git checkout main
git pull origin main
git log --oneline -5  # Verify you see latest commits
```

### Post-Deployment (Immediately After)
- [ ] Visit production URL in browser
- [ ] App loads without errors
- [ ] Main features work: create chat, send message, get response
- [ ] Mobile UI works on actual phone
- [ ] Check production logs for errors (if available)

### Monitor for 1 Hour
- [ ] No spike in error rates
- [ ] No performance degradation
- [ ] No user complaints in support channel
- [ ] Server resources normal (CPU, memory, storage)

---

## Rollback Plan (If Issues Found)

**If problems after deployment:**

```bash
# 1. Identify last good commit
git log --oneline | head -20

# 2. Revert to previous version
git revert HEAD

# 3. Push to production immediately
git push origin main

# 4. GitHub Actions will run
# 5. Wait for all checks to pass ✅
# 6. Deployment complete

# 7. Investigate issue separately
git checkout -b hotfix/issue-name
# ... fix issue ...
git push origin hotfix/issue-name
# Create PR and merge normally
```

---

## Documentation Updates

### Before Deployment
- [ ] Update CHANGELOG.md with new features
- [ ] Update README.md if API changes
- [ ] Update any user-facing documentation
- [ ] Add any new keyboard shortcuts to help docs

### After Successful Deployment
- [ ] Tag commit with version: `git tag v1.2.3 && git push --tags`
- [ ] Create GitHub Release with changelog
- [ ] Update deployment date in docs
- [ ] Announce changes to team/users

---

## Team Sign-Off

For production deployments, **all boxes must be checked** by:

| Role | Responsibility | Signed |
|------|-----------------|--------|
| Developer | Code quality, TypeScript errors, testing | ☐ |
| QA | Feature testing, browser compatibility, UX | ☐ |
| DevOps | Environment setup, deployment, monitoring | ☐ |
| Project Lead | Feature completion, approval | ☐ |

---

## Common Deployment Issues & Solutions

| Issue | Cause | Fix |
|-------|-------|-----|
| White screen on load | Unhandled error in render | Check ErrorBoundary, review console errors |
| 404 on assets | Wrong build path | Check vite.config.ts, verify dist/ folder |
| API calls fail | Prod endpoint wrong | Check environment variables, API URL config |
| Styles missing | CSS not bundled | Check Tailwind config, npm run build output |
| TypeScript errors at runtime | Missed type check | Should be caught by GitHub Actions |
| Performance slow | Large bundle size | Check build output, lazy load components |

---

## Post-Deployment Verification

### 24 Hours After Deployment
- [ ] Error tracking shows 0 critical issues
- [ ] User feedback is positive
- [ ] No rollback needed
- [ ] Performance metrics normal
- [ ] All monitoring alerts OK

### 1 Week After Deployment
- [ ] No recurring issues reported
- [ ] Feature adoption good
- [ ] No user complaints
- [ ] Ready to move on to next feature

---

## Useful Commands

```bash
# Type check (catches errors)
npx tsc --noEmit 2>&1

# Build for production
npm run build

# Preview production build locally
npm run preview

# Check git status before pushing
git status

# View recent commits
git log --oneline -10

# Tag a release
git tag v1.2.3
git push --tags

# Check GitHub Actions status
# Visit: https://github.com/dhruvinrsoni/samvada-studio/actions

# View deployment logs (if using GitHub Pages or Vercel)
# Visit deployment service dashboard
```

---

## Need Help?

- **TypeScript errors?** → `npx tsc --noEmit 2>&1`
- **Build errors?** → `npm run build` (check output)
- **GitHub Actions failed?** → Check `.github/workflows/test.yml`
- **Deployment failed?** → Check deployment logs on hosting platform
- **Production error?** → Check ErrorBoundary component and error tracking service
- **General questions?** → See [DEVELOPMENT_GUIDELINES.md](DEVELOPMENT_GUIDELINES.md)

---

**Remember:** A few minutes of pre-deployment checks saves hours of post-production debugging.
