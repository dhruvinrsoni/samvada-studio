# 🤝 Contributing to Samvada Studio

Thank you for considering contributing to Samvada Studio! This document provides guidelines and information for contributors.

---

## 📋 Table of Contents

1. [Code of Conduct](#-code-of-conduct)
2. [How Can I Contribute?](#-how-can-i-contribute)
3. [Development Setup](#-development-setup)
4. [Project Structure](#-project-structure)
5. [Coding Standards](#-coding-standards)
6. [Commit Guidelines](#-commit-guidelines)
7. [Pull Request Process](#-pull-request-process)
8. [Testing](#-testing)

---

## 📜 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

---

## 🎯 How Can I Contribute?

### 🐛 Reporting Bugs

**Before submitting a bug report:**
- Check existing [Issues](https://github.com/dhruvinrsoni/samvada-studio/issues)
- Try to reproduce on the latest version
- Check [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

**When submitting a bug:**
- Use a clear, descriptive title
- Provide steps to reproduce
- Include expected vs. actual behavior
- Add screenshots/GIFs if applicable
- Include browser/OS information
- Mention the version you're using

**Bug Report Template:**
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable.

**Environment:**
- Browser: [e.g. Chrome 120]
- OS: [e.g. Windows 11]
- Version: [e.g. 1.0.0]
```

### 💡 Suggesting Features

**Before suggesting:**
- Check existing [Discussions](https://github.com/dhruvinrsoni/samvada-studio/discussions)
- Review the [Roadmap](README.md#-roadmap)

**When suggesting:**
- Use a clear, descriptive title
- Explain the problem it solves
- Describe the proposed solution
- Consider alternative solutions
- Add mockups/examples if applicable

**Feature Request Template:**
```markdown
**Problem Statement**
What problem does this solve?

**Proposed Solution**
How should it work?

**Alternatives Considered**
Other approaches you've thought of.

**Additional Context**
Any other information, mockups, etc.
```

### 📝 Improving Documentation

Documentation improvements are always welcome!

- Fix typos or clarify existing docs
- Add missing examples or screenshots
- Translate documentation
- Create tutorials or guides

### 🎨 Design Contributions

- UI/UX improvements
- Icons and illustrations
- Branding materials
- Demo videos

### 🔧 Code Contributions

See sections below for technical contributions.

---

## 💻 Development Setup

### 1. Fork & Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/dhruvinrsoni/samvada-studio.git
cd samvada-studio
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Make Your Changes

Follow the [Coding Standards](#-coding-standards) below.

### 6. Test Your Changes

```bash
npm run build  # Ensure it builds
npx tsc --noEmit  # Type-check
```

---

## 📁 Project Structure

```
samvada-studio/
├── src/
│   ├── components/          # React components
│   │   ├── admin/           # Provider management UI
│   │   ├── chat/            # Chat area, prompts, responses
│   │   ├── common/          # Reusable components
│   │   ├── context/         # Context panel
│   │   ├── export/          # Export functionality
│   │   ├── search/          # Global search
│   │   ├── sidebar/         # Sidebar, chat list
│   │   ├── starred/         # Starred messages modal
│   │   └── templates/       # Templates library
│   ├── context/             # React Context (state management)
│   │   ├── ChatContext.tsx  # Main app state
│   │   └── ToastContext.tsx # Toast notifications
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   │   ├── llmService.ts    # LLM provider integrations
│   │   ├── storage.ts       # localStorage management
│   │   ├── helpers.ts       # General utilities
│   │   ├── theme.ts         # Theme system
│   │   └── contentSanitizer.ts  # Security
│   ├── constants/           # App constants
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── docs/                    # Documentation
├── public/                  # Static assets
└── ...config files
```

---

## ✅ Coding Standards

### TypeScript

- **Always use TypeScript** — No JavaScript files
- **Explicit types** — Avoid `any` when possible
- **Interfaces over types** — Use `interface` for object shapes
- **Null safety** — Check for null/undefined

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email?: string;  // Optional with ?
}

const getUser = (id: string): User | null => {
  // ...
};

// ❌ Bad
const getUser = (id: any): any => {
  // ...
};
```

### React

- **Functional components** with hooks
- **Named exports** for components
- **Props interface** for every component
- **useCallback/useMemo** for performance

```tsx
// ✅ Good
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export default function MyComponent({ title, onAction }: MyComponentProps) {
  const handleClick = useCallback(() => {
    onAction();
  }, [onAction]);

  return <button onClick={handleClick}>{title}</button>;
}
```

### Styling

- **Tailwind CSS** for all styling
- **No inline styles** unless absolutely necessary
- **Use theme variables** for colors
- **Responsive** by default

```tsx
// ✅ Good
<div className={`p-4 rounded-lg ${isDark ? 'bg-dark-200' : 'bg-light-100'}`}>

// ❌ Bad
<div style={{padding: '16px', background: '#1a1a1a'}}>
```

### File Organization

- **One component per file**
- **Index files** for barrel exports
- **Co-locate** related files
- **Descriptive names** — `PromptInput.tsx` not `Input.tsx`

### Code Quality

- **DRY** — Don't Repeat Yourself
- **SOLID** principles
- **Descriptive names** — `getUserById` not `get`
- **Small functions** — One responsibility
- **Comments** — Explain "why", not "what"

```typescript
// ✅ Good
// Prevents race condition when hydrating from localStorage
useEffect(() => {
  if (hasHydrated.current) {
    saveToStorage(state);
  }
}, [state]);

// ❌ Bad
// Saves to storage
useEffect(() => {
  if (hasHydrated.current) {
    saveToStorage(state);
  }
}, [state]);
```

---

## 📝 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style (formatting, no logic change)
- **refactor**: Code refactoring
- **perf**: Performance improvement
- **test**: Adding tests
- **chore**: Build/tooling changes

### Examples

```bash
feat(chat): add voice input support

Implement speech-to-text using Web Speech API.
Includes start/stop controls and real-time preview.

Closes #42
```

```bash
fix(search): highlight matching text correctly

Previous implementation missed matches at line boundaries.
Now uses proper regex with word boundaries.

Fixes #15
```

```bash
docs(readme): update installation instructions

Added Node.js version requirement and
troubleshooting section for common issues.
```

---

## 🔄 Pull Request Process

### 1. Before Creating PR

- ✅ Code builds without errors
- ✅ TypeScript type-checks pass (`npx tsc --noEmit`)
- ✅ No console errors in browser
- ✅ Tested in dark and light themes
- ✅ Responsive on mobile/tablet/desktop
- ✅ Commits follow guidelines

### 2. Create Pull Request

**Title Format:**
```
<type>: <description>

Examples:
feat: Add export to PDF format
fix: Prevent crash when deleting last chat
docs: Update contribution guidelines
```

**Description Template:**
```markdown
## What does this PR do?
Brief description

## Related Issue
Closes #123

## Changes Made
- Added X feature
- Fixed Y bug
- Updated Z documentation

## Screenshots
(if applicable)

## Checklist
- [ ] Code builds successfully
- [ ] TypeScript checks pass
- [ ] Tested in dark/light themes
- [ ] Responsive design
- [ ] Documentation updated
```

### 3. Review Process

- Maintainer will review within 48-72 hours
- Address any requested changes
- Once approved, maintainer will merge

### 4. After Merge

- Your contribution will be in the next release
- You'll be added to contributors list
- Close any related issues

---

## 🧪 Testing

### Manual Testing Checklist

Before submitting, test:

**Core Functionality:**
- [ ] Send prompt to LLM
- [ ] Receive and display response
- [ ] Inline editing (prompt & response)
- [ ] Regenerate response
- [ ] Switch between drafts

**Organization:**
- [ ] Create new chat
- [ ] Archive/unarchive chat
- [ ] Star message/conversation
- [ ] Create folder
- [ ] Drag chat to folder

**Search & Navigation:**
- [ ] Global search (Ctrl+Shift+F)
- [ ] Command palette (Ctrl+K)
- [ ] Navigate with keyboard

**Persistence:**
- [ ] Refresh page — state persists
- [ ] Add provider — saves correctly
- [ ] Clear data — everything removed

**Theme:**
- [ ] Toggle dark/light mode
- [ ] Change accent color
- [ ] Adjust font size

**Edge Cases:**
- [ ] Empty states (no chats, no messages)
- [ ] Long messages (scroll, formatting)
- [ ] Special characters in input
- [ ] Rapid clicking/keyboard input

---

## 🏆 Recognition

Contributors will be:
- Listed in `CONTRIBUTORS.md`
- Mentioned in release notes
- Thanked in commit messages
- Given proper credit in documentation

---

## 📞 Questions?

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, general chat
- **Email**: [Your contact email]

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

<div align="center">

**Thank you for contributing to Samvada Studio! 🙏**

</div>
