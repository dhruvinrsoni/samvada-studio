# Debug Mode - Quick Reference Guide

## 🚀 How to Access Debug Mode

### Option 1: Keyboard Shortcut (Fastest)
```
Press: Ctrl + Shift + D
```
- Works on any screen
- Instant toggle (open/close)
- Desktop and mobile (with external keyboard)

### Option 2: Settings → Developer Tab (Mobile-Friendly)

#### Step-by-Step:
1. **Open Settings**
   - Click the ⚙️ gear icon (top-right or sidebar)

2. **Navigate to Developer Tab**
   - Click on "Developer" tab in the settings panel

3. **Click Debug Mode Button**
   - Find the purple 🔍 **Debug Mode** button
   - Located in the "Quick Actions" section
   - First button in the grid

4. **Panel Opens**
   - Debug panel appears in the top-left corner
   - Fully draggable, collapsible, and theme-compliant

---

## 🎨 Visual Layout

### Settings → Developer → Quick Actions
```
┌─────────────────────────────────────────────┐
│  🛠️ Developer Tools                   [Dev]│
│  Run checks or full diagnostics              │
├─────────────────────────────────────────────┤
│  QUICK ACTIONS                               │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │🔍 Debug  │ │🌐 Connect│ │💾 Storage│    │
│  │  Mode    │ │   ivity  │ │          │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│                                              │
│  ┌──────────┐ ┌──────────┐                 │
│  │💻 System │ │📜 View   │                 │
│  │   Info   │ │   Logs   │                 │
│  └──────────┘ └──────────┘                 │
│                                              │
│  💡 Debug Mode: Draggable developer panel   │
│     with real-time health monitoring...     │
│     Press Ctrl+Shift+D to toggle.           │
└─────────────────────────────────────────────┘
```

---

## 🎮 Debug Mode Controls

Once Debug Mode is open:

### Header Controls
- **Drag**: Click and hold the header to move the panel anywhere
- **−** (Minimize): Collapse to 48×48px corner icon
- **↕** (Collapse): Toggle content visibility (hide/show body)
- **✕** (Close): Close the panel completely

### Content Sections
1. **⚡ Quick Actions**
   - 🔄 Refresh: Re-run all health checks
   - 🐛 Bug Report: Generate and copy full report
   - 📋 Copy: Copy current state to clipboard

2. **🏥 Health Status**
   - Theme System, Storage, State, Debug Log checks
   - Color-coded status indicators (✅ Pass, ⚠️ Warning, ❌ Fail)

3. **📊 Console API**
   - Available debug functions to run in browser console
   - Examples: `healthMonitor.runAllChecks()`, `llmDebug.bugReport()`

4. **🖥️ System Info**
   - Theme, Device type, Viewport size, User agent, Timestamp

---

## 🎯 Mobile Optimization

### Before (Old Method - Removed)
```
Mobile Screen:
┌─────────────────┐
│                 │
│   Chat Area     │
│                 │
│   [Input Box]   │
│          [Send] │ ← Main button
│          [🔍]   │ ← FAB (CONFLICT!)
└─────────────────┘
```

### After (New Method - Clean)
```
Mobile Screen:
┌─────────────────┐
│                 │
│   Chat Area     │
│                 │
│   [Input Box]   │
│          [Send] │ ← No overlap!
└─────────────────┘

Access via: Settings ⚙️ → Developer → 🔍 Debug Mode
```

---

## 💡 Pro Tips

### For Mobile Users
1. **Bookmark the path**: Settings → Developer → Debug Mode
2. **Pin Settings**: Keep Settings panel open for quick access
3. **Use gestures**: Drag the panel to a comfortable position

### For Desktop Users
1. **Muscle memory**: Ctrl+Shift+D becomes second nature
2. **Position it**: Drag to your preferred corner/side
3. **Minimize when not needed**: − button keeps it accessible

### For All Users
1. **Theme integration**: Panel automatically matches your theme (dark/light)
2. **Persistent position**: Panel remembers where you dragged it
3. **Collapsible design**: Minimize width OR height based on your workflow
4. **Non-intrusive**: Only shows in DEV mode, hidden in production

---

## 🐛 Troubleshooting

### Panel not opening?
- ✅ Check you're in **DEV mode** (only works during development)
- ✅ Try keyboard shortcut: Ctrl+Shift+D
- ✅ Check browser console for errors

### Button not in Developer tab?
- ✅ Update to latest version
- ✅ Clear browser cache (Ctrl+Shift+R)
- ✅ Check you're on the "Developer" tab (not "Settings" or "PWA")

### Panel disappeared?
- ✅ It might be minimized (look for 48×48px 🔍 icon in corners)
- ✅ Press Ctrl+Shift+D to re-open
- ✅ Check if it was dragged off-screen (refresh page to reset)

---

## 📝 What Changed?

### Old Activation (Removed)
- ❌ Floating button appeared after 3 seconds (cluttered UI)
- ❌ Triple-tap gesture to show button (hidden feature)
- ❌ Button overlapped send button on mobile (UX conflict)

### New Activation (Current)
- ✅ Settings → Developer → Debug Mode button (discoverable)
- ✅ Keyboard shortcut Ctrl+Shift+D (power users)
- ✅ Clean UI, no floating buttons (better UX)

---

## 🔗 Related Docs

- [Full Debug Mode Guide](./DEBUG_MODE_GUIDE.md) - Comprehensive documentation
- [Developer Tools Overview](../README.md#developer-tools) - All dev features
- [Changelog](./CHANGELOG_DEBUG_MODE_MOBILE_FIX.md) - Technical changes

---

**Last Updated:** 2024
**Version:** Post-FAB-removal (current)
