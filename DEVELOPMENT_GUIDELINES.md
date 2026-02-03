# Development Guidelines for Samvada Studio

## Overview
This document prevents the **56 TypeScript errors** we fixed from recurring. All developers must follow these guidelines before submitting code.

---

## 1. GitHub Actions: Automated Safety Net

### What is GitHub Actions?
GitHub Actions is **automated testing that runs on every commit** before code reaches production.

**How it works:**
1. You push code to GitHub
2. GitHub automatically runs `npx tsc --noEmit` (type check)
3. GitHub automatically runs `npm run build` (build check)
4. If checks fail → code is blocked from merging
5. If checks pass → code can be deployed

### Why Previous Deployments Failed
- ❌ No GitHub Actions = manual testing = errors slipped through
- ❌ TypeScript errors not caught until production = white screen for users
- ❌ Broken code deployed because nobody ran `npx tsc --noEmit` locally
- ❌ ESLint warnings ignored = inconsistent code quality
- ❌ No build verification = runtime errors discovered by customers

### Current Setup (.github/workflows/test.yml)
Runs on every push/pull request:
```yaml
✅ Type Check: npx tsc --noEmit
✅ Build: npm run build  
✅ ESLint: Code quality check
✅ Pre-deployment: Extra strict check before main branch
```

### How to Check Locally Before Pushing
Run this before every commit:
```bash
# Type check (catches errors like we fixed)
npx tsc --noEmit 2>&1

# Build (catches runtime issues)
npm run build

# Linting (catches style issues)
npx eslint src

# Test (if you write tests)
npm test
```

If any command fails, **fix it before pushing**. GitHub Actions will block the merge.

---

## 2. Common Error Patterns & Fixes

### Pattern 1: Accessing Undefined Values
**❌ BAD** - TypeScript error TS2532/TS2531
```typescript
const history = state.promptResponses[index].history;
history.forEach(item => { ... }); // ERROR: history might be undefined
```

**✅ GOOD** - Use optional chaining (`?.`)
```typescript
const history = state.promptResponses[index]?.history;
history?.forEach(item => { ... }); // Safe: skips if undefined
```

### Pattern 2: Array Index Without Bounds Check
**❌ BAD** - TypeScript error TS2532
```typescript
const lastLine = promptText.split('\n')[promptText.split('\n').length - 1];
// ERROR: lastLine might be undefined
```

**✅ GOOD** - Add null check with fallback
```typescript
const lines = promptText.split('\n');
const lastLine = lines[lines.length - 1] ?? ''; // Fallback to empty string
```

### Pattern 3: Type Mismatches on Objects
**❌ BAD** - TypeScript error TS2538
```typescript
const provider = providers[0];
if (provider.model === 'gpt-4') { // ERROR: model might not exist
  // ...
}
```

**✅ GOOD** - Use type guards
```typescript
const provider = providers[0];
if (provider && 'model' in provider && provider.model === 'gpt-4') {
  // ...
}
// Or use interface/type checking:
if (provider && typeof provider.model === 'string' && provider.model === 'gpt-4') {
  // ...
}
```

### Pattern 4: Optional Function Returns
**❌ BAD** - useEffect error TS2341
```typescript
useEffect(() => {
  loadData();
  // ERROR: useEffect must return void or cleanup function
});
```

**✅ GOOD** - Add explicit return
```typescript
useEffect(() => {
  const cleanup = loadData();
  return cleanup; // Must return void or (() => void)
});
```

### Pattern 5: Accessing Object Properties Without Checks
**❌ BAD** - TypeScript error TS2339
```typescript
const cost = TOKEN_COSTS['javascript'];
if (cost < 1000) { // ERROR: cost might be undefined
  // ...
}
```

**✅ GOOD** - Use nullish coalescing
```typescript
const cost = TOKEN_COSTS['javascript'] ?? 0;
if (cost < 1000) { // Safe: defaults to 0
  // ...
}
```

### Pattern 6: Speech API Results (Optional Data)
**❌ BAD** - TypeScript error TS2532
```typescript
const transcript = event.results[i][0].transcript;
// ERROR: event.results[i] might not exist
```

**✅ GOOD** - Use optional chaining
```typescript
const transcript = event.results?.[i]?.[0]?.transcript ?? '';
// Safe: returns empty string if any level is undefined
```

### Pattern 7: Type Assertions (Last Resort)
**❌ BAD** - Overuse of `as` keyword
```typescript
const model = (provider.model as any).name; // Dangerous!
```

**✅ GOOD** - Use type guards first
```typescript
interface ProviderModel {
  name: string;
}

function getModelName(provider: Provider): string {
  if (provider.model && typeof provider.model === 'object' && 'name' in provider.model) {
    return (provider.model as ProviderModel).name;
  }
  return '';
}
```

---

## 3. Best Practices

### 3.1 Null/Undefined Checks
Always check before accessing:

```typescript
// ✅ GOOD: All access points protected
const processHistory = (history: any[] | undefined) => {
  if (!history) return []; // Check at entry point
  
  return history.map(item => {
    const text = item?.text ?? ''; // Default value
    return text.toLowerCase();
  });
};
```

### 3.2 Optional Chaining Usage
Use `?.` for safe object navigation:

```typescript
// Instead of:
const name = user && user.profile && user.profile.name;

// Use:
const name = user?.profile?.name;
```

### 3.3 Nullish Coalescing vs OR Operator
Use `??` (nullish) not `||` (falsy):

```typescript
// ❌ BAD: 0 is falsy, so this breaks
const count = formData.count || 0; // If count=0, becomes 0 (correct) or default?

// ✅ GOOD: Only replace null/undefined
const count = formData.count ?? 0; // If count=0, stays 0
```

### 3.4 Type Assertions (Use Sparingly)
Only when you're 100% certain:

```typescript
// ❌ Avoid
const x = data as any;

// ✅ If necessary, be specific
const x = data as SomeKnownType;
```

### 3.5 Array Operations
Always handle empty arrays:

```typescript
const lastItem = array[array.length - 1]; // Could be undefined
const lastItemSafe = array[array.length - 1] ?? null;

// Better:
const [lastItem] = array.slice(-1);
```

---

## 4. Pre-Commit Checklist

Before pushing code:

- [ ] Run `npx tsc --noEmit 2>&1` - Must have 0 errors
- [ ] Run `npm run build` - Must succeed
- [ ] Run `npx eslint src` - Check warnings
- [ ] Used `?.` for optional access (not `&&`)
- [ ] Used `??` for nullish coalescing (not `||` unless intended)
- [ ] All undefined values have null checks
- [ ] useEffect returns cleanup function (or void)
- [ ] No `any` types (except when absolutely necessary)
- [ ] No unhandled Promise rejections
- [ ] Tested in both dev and production modes
- [ ] Checked console for errors (not just dev console)

---

## 5. Error Handling Strategy

### Development Mode
When errors occur:
- ✅ ErrorBoundary shows full error stack
- ✅ Console shows detailed error messages
- ✅ Clear indication of what failed and where

### Production Mode
When errors occur:
- ✅ ErrorBoundary shows user-friendly message
- ✅ Console hides sensitive details (security)
- ✅ Recovery options: reload, go home, clear cache
- ✅ Error logged to service (Sentry, etc.)

### Key File: src/components/common/ErrorBoundary.tsx
This component prevents white-screen crashes:

```typescript
// ✅ Wrapped around App sections for safety
<ErrorBoundary name="Chat Area">
  <ChatArea />
</ErrorBoundary>

// If ChatArea throws error:
// ❌ Without ErrorBoundary: White screen, user angry
// ✅ With ErrorBoundary: User-friendly error UI, app recoverable
```

---

## 6. Strict TypeScript Settings

Our tsconfig.json includes:

```json
{
  "compilerOptions": {
    "strict": true,                          // All strict options
    "noUnusedLocals": true,                  // Catch unused variables
    "noUnusedParameters": true,              // Catch unused parameters
    "noFallthroughCasesInSwitch": true,     // Switch case safety
    "noUncheckedIndexedAccess": true,       // Array access safety
    "noImplicitReturns": true,              // Function return safety
    "noPropertyAccessFromIndexSignature": true  // Property access safety
  }
}
```

**These settings prevent errors like the 56 we fixed.**

---

## 7. TypeScript Error Reference

Common errors you'll see:

| Error | Cause | Fix |
|-------|-------|-----|
| TS2532 | Accessing property of possibly undefined | Use `?.` or add null check |
| TS2531 | Cannot read property of null/undefined | Add null guard |
| TS2538 | Type has no properties/methods | Check type exists first |
| TS2339 | Property doesn't exist on type | Typo or type mismatch |
| TS2341 | Private property accessed | Respect encapsulation |
| TS2699 | Expression not callable | Check type is a function |
| TS7030 | Parameter not provided | Check function signature |

**Solution: Run `npx tsc --noEmit 2>&1` to see exact errors**

---

## 8. Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# ... edit code ...

# 3. Run checks BEFORE committing
npx tsc --noEmit 2>&1  # Type check
npm run build          # Build check
npx eslint src        # Lint check

# 4. Commit if checks pass
git add .
git commit -m "feat: add my feature"

# 5. Push
git push origin feature/my-feature

# 6. GitHub Actions runs automatically
# Check: https://github.com/dhruvinrsoni/samvada-studio/actions
# If ❌ failed: Fix and push again
# If ✅ passed: Ready to merge
```

---

## 9. Common Issues & Solutions

### Issue: "npm run dev" fails with TypeScript errors
**Solution:**
```bash
npx tsc --noEmit 2>&1  # See exact errors
# Fix each error following patterns above
npm run dev            # Try again
```

### Issue: GitHub Actions shows "Build failed"
**Solution:**
1. Pull latest code: `git pull origin`
2. Run locally: `npm install && npx tsc --noEmit 2>&1`
3. Fix errors shown
4. Push fix

### Issue: "Cannot find module" errors
**Solution:**
```bash
npm install            # Reinstall dependencies
rm -rf node_modules   # (Windows: rmdir /s /q node_modules)
npm ci                # Clean install
npx tsc --noEmit 2>&1 # Check again
```

### Issue: Types don't match
**Solution:**
1. Check the type definition: Hover over variable in VS Code
2. Compare with what you're assigning
3. Use type guards or assertions to fix

---

## 10. Production Deployment Checklist

**Never deploy without:**
- ✅ All GitHub Actions checks passing (green ✓)
- ✅ `npx tsc --noEmit 2>&1` returns 0 errors
- ✅ `npm run build` completes successfully
- ✅ Tested in production mode locally (`npm run preview`)
- ✅ No `console.error` or `console.warn` in production
- ✅ Environment variables set correctly
- ✅ ErrorBoundary wraps all major sections
- ✅ See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

## 11. Questions?

**TypeScript issues:** Check error message with `npx tsc --noEmit 2>&1`
**Build issues:** Check `npm run build` output
**GitHub Actions:** Check workflow file at `.github/workflows/test.yml`
**Error handling:** See `src/components/common/ErrorBoundary.tsx`

---

**Last Updated:** After fixing 56 TypeScript errors
**Status:** All guidelines enforced by GitHub Actions
