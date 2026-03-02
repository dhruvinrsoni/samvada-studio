# PWA Guide

Samvada Studio can be installed as a standalone app on any device.

## Install

**Chrome / Edge (desktop)**
1. Visit the app in your browser
2. Click the install icon (⊕) in the address bar, or three-dot menu → "Install Samvada Studio..."
3. Confirm

**Android (Chrome)**
1. Tap the browser menu → "Add to Home screen" / "Install app"
2. Confirm

**iOS / iPadOS (Safari)**
1. Tap the Share button (□↑)
2. Tap "Add to Home Screen"
3. Tap "Add"

**From within the app**: Theme Settings (gear icon) → scroll to "Install App" section.

---

## Offline Support

Works offline once loaded:
- View all saved chats and history
- All UI features and navigation
- Theme settings and preferences

Requires internet:
- Sending prompts to LLM providers
- AI responses

A yellow banner appears when offline.

---

## Updates

When a new version is available, a notification appears in the top-right corner. Click "Update Now" to reload with the latest version. The service worker checks for updates automatically.

If the app seems stale, close all instances and clear browser cache for the site.

---

## Troubleshooting

**Install prompt not appearing** — already installed, or browser doesn't support it. Check your apps/home screen.

**Offline features not working** — load the app online at least once first. Check DevTools → Application → Service Workers.

**App not updating** — close all windows, clear site cache, reopen.
