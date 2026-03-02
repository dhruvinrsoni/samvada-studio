# Contributing to Samvada Studio

## Dev Setup

```bash
git clone https://github.com/dhruvinrsoni/samvada-studio.git
cd samvada-studio
npm install
npm run dev          # http://localhost:5173
npx tsc --noEmit     # type-check
npm run build        # verify build
```

## Branching

```bash
git checkout -b feature/your-feature   # or fix/your-fix
```

## Coding Standards

**TypeScript**
- No `any` — use explicit types
- Interfaces for object shapes
- Null-check before accessing optional props

**React**
- Functional components only
- Named exports; props interface for every component
- Tailwind for all styling (`isDark ? 'dark-class' : 'light-class'`)
- Use `compact:` Tailwind variant for compact-mode density adjustments

**File conventions**
- One component per file
- Descriptive names: `PromptInput.tsx` not `Input.tsx`
- Barrel exports via `index.ts` in UI primitives (`src/components/ui/`)

## Commit Format

```
feat(chat): add voice input support
fix(search): highlight matches at line boundaries
docs(readme): update installation steps
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `chore`

## PR Checklist

- [ ] `npx tsc --noEmit` passes (zero errors)
- [ ] `npm run build` succeeds
- [ ] Tested in dark and light themes
- [ ] Responsive on mobile and desktop

## Reporting Issues

Use [GitHub Issues](https://github.com/dhruvinrsoni/samvada-studio/issues). Include steps to reproduce, expected vs actual behavior, browser/OS.

## License

By contributing, you agree your code is licensed under MIT.
