# 📱 Progressive Web App (PWA) Guide

Samvada Studio is a **Progressive Web App (PWA)** — you can install it as a standalone application on your device for a faster, app-like experience with offline support.

## ✨ PWA Features

### 🚀 **Install as App**
- Add Samvada Studio to your home screen or desktop
- Launch from app drawer like native apps
- Full-screen, distraction-free experience
- Works on Windows, macOS, Linux, Android, and iOS

### 📶 **Offline Support**
- All chat history available offline
- Continue working without internet
- Automatic sync when back online
- Offline indicator shows connection status

### ⚡ **Performance**
- Instant loading with cached assets
- Service worker for background operations
- Automatic updates with notification
- Optimized caching strategies

### 🔄 **Auto Updates**
- New versions automatically detected
- Non-intrusive update notification
- One-click update to latest version
- Zero downtime during updates

---

## 📥 How to Install

### **Chrome / Edge (Desktop)**

1. Visit [Samvada Studio](https://dhruvinrsoni.github.io/samvada-studio/)
2. Look for the **Install** prompt that appears at the bottom of the screen
3. Click **"Install App"**
4. Or click the install icon (⊕) in the browser's address bar
5. Confirm the installation

**Alternative:**
- Click the **three-dot menu (⋮)** → **"Install Samvada Studio..."**

### **Chrome / Edge (Android)**

1. Open Samvada Studio in Chrome
2. Tap the **"Add to Home screen"** banner
3. Or tap **menu (⋮)** → **"Install app"**
4. Confirm installation
5. Find the app in your app drawer

### **Safari (iOS / iPadOS)**

1. Open Samvada Studio in Safari
2. Tap the **Share button** (□↑)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** to confirm
5. Find the app on your home screen

### **Firefox**

Firefox supports PWAs through the browser interface:
1. Look for the install prompt in the URL bar
2. Or use browser settings to add to home screen

---

## ⚙️ Installing from Settings

You can also trigger the install from within the app:

1. Open Samvada Studio
2. Click the **Theme Settings** button (🌙/☀️ icon) in the top bar
3. Scroll down to the **"Install App"** section
4. Click the **"Install App"** button
5. Follow the browser's installation prompts

This section also shows:
- Whether the app is already installed
- Service worker status
- Online/offline connection status

---

## 🔄 Updating the App

When a new version of Samvada Studio is available:

1. A notification appears in the top-right corner
2. Click **"Update Now"** to apply the update
3. The app will reload with the latest version

### **Automatic Updates**
- The service worker checks for updates every hour
- Updates are downloaded in the background
- You're notified when ready to apply

### **Manual Update Check**
- Close and reopen the app to trigger an update check
- Clear browser cache if issues persist

---

## 📶 Offline Mode

### **What Works Offline**
- ✅ Access all saved chats
- ✅ View chat history and messages
- ✅ Edit prompts and responses
- ✅ All UI features and navigation
- ✅ Theme settings and preferences

### **What Requires Internet**
- ❌ Sending new prompts to LLM providers
- ❌ Generating new AI responses
- ❌ Testing provider connections

### **Offline Indicator**
When offline, a yellow indicator appears at the bottom of the screen:
> 📶 **You're offline** • Local data available

---

## 🛠️ Technical Details

### **Service Worker**
Samvada Studio uses a service worker for:
- Caching static assets (JS, CSS, images)
- Offline navigation fallback
- Background sync (future)
- Push notifications (future)

### **Caching Strategy**
| Asset Type | Strategy | Duration |
|------------|----------|----------|
| App shell (HTML/JS/CSS) | Precache | Until update |
| Images | Stale-While-Revalidate | 30 days |
| Fonts | Cache First | 1 year |
| API responses | Network First | 24 hours |

### **Storage**
- All chat data stored in localStorage
- Persists across sessions
- Available offline immediately
- ~5MB typical storage usage

---

## 🔧 Troubleshooting

### **"Install" option not appearing**

1. **Already installed**: Check if app is already in your apps
2. **Browser support**: Use Chrome, Edge, or Safari
3. **HTTPS required**: PWA install requires secure connection
4. **Clear cache**: Try clearing browser cache and reloading

### **App not updating**

1. Close all instances of the installed app
2. Clear browser cache for the site
3. Reload the page
4. Check for the update notification

### **Offline features not working**

1. Ensure the app was loaded at least once while online
2. Check service worker status in Theme Settings
3. Clear cache and reload to reinitialize

### **Checking Service Worker Status**

Open browser DevTools → Application → Service Workers to see:
- Registration status
- Cache contents
- Update status

---

## 🌐 Browser Support

| Browser | Install | Offline | Updates |
|---------|---------|---------|---------|
| Chrome | ✅ Full | ✅ Full | ✅ Auto |
| Edge | ✅ Full | ✅ Full | ✅ Auto |
| Safari | ⚠️ Manual | ✅ Full | ⚠️ Manual |
| Firefox | ⚠️ Limited | ✅ Full | ✅ Auto |
| Samsung Internet | ✅ Full | ✅ Full | ✅ Auto |

**Legend:**
- ✅ Full support
- ⚠️ Limited or manual steps required

---

## 💡 Best Practices

### **For Best Experience**
1. **Install the app** for fastest loading
2. **Stay updated** when notifications appear
3. **Load while online** before going offline
4. **Use Settings install** if banner dismissed

### **Data Safety**
- All data stored locally in your browser
- No cloud sync (your data stays on your device)
- Export regularly for backup
- Works the same whether installed or not

---

## 📋 PWA Manifest

The app manifest defines:
- App name and description
- Theme colors
- Icons for different platforms
- App shortcuts
- Display mode (standalone)
- Orientation preference

View the full manifest at `/manifest.webmanifest`

---

## 🎯 Keyboard Shortcuts (Installed App)

All keyboard shortcuts work in the installed app:

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command Palette |
| `Ctrl+Enter` | Send Message |
| `Ctrl+M` | Voice Input |
| `Ctrl+.` | Text-to-Speech |
| `?` | Keyboard Shortcuts |

---

**Enjoy Samvada Studio as your personal AI workspace! 🚀**
