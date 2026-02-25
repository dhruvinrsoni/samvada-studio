# Toast Notification System

A generic, reusable toast notification system for React applications with the following features:

## Features

- ✅ **Auto-dismiss**: Toasts automatically disappear after 5 seconds (configurable)
- ✅ **Hover to pause**: Hovering over a toast pauses the countdown
- ✅ **Multiple types**: Success, error, warning, and info toasts
- ✅ **Progress bar**: Visual countdown indicator
- ✅ **Top-right positioning**: Fixed position in top-right corner
- ✅ **Dark mode support**: Adapts to light/dark themes
- ✅ **Accessible**: Proper ARIA attributes and keyboard navigation
- ✅ **TypeScript**: Fully typed with TypeScript
- ✅ **Generic**: Can be used in any React application

## Usage

### Basic Setup

```tsx
import { ToastProvider, useToast } from './path/to/toast';

function App() {
  return (
    <ToastProvider>
      <YourAppContent />
    </ToastProvider>
  );
}

function YourComponent() {
  const { addToast } = useToast();

  const handleAction = () => {
    addToast('success', 'Success!', 'Operation completed successfully.');
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

### Toast Types

```tsx
// Success toast
addToast('success', 'Saved!', 'Your changes have been saved.');

// Error toast
addToast('error', 'Failed!', 'Unable to save changes.');

// Warning toast
addToast('warning', 'Warning!', 'Please check your input.');

// Info toast
addToast('info', 'Info', 'Here is some information.');
```

### Custom Duration

```tsx
// Custom duration (10 seconds)
addToast('success', 'Success!', 'Operation completed.', 10000);
```

### Positioning

The toast container supports different positions:

```tsx
<ToastContainer position="top-right" />  // Default
<ToastContainer position="top-left" />
<ToastContainer position="bottom-right" />
<ToastContainer position="bottom-left" />
```

## API Reference

### ToastProvider

Wraps your app to provide toast context.

```tsx
<ToastProvider>
  {children}
</ToastProvider>
```

### useToast Hook

Returns toast management functions.

```tsx
const { toasts, addToast, removeToast, clearAllToasts } = useToast();
```

#### addToast(type, title, message?, duration?)

- `type`: `'success' | 'error' | 'warning' | 'info'`
- `title`: `string` - The toast title
- `message?`: `string` - Optional message
- `duration?`: `number` - Duration in milliseconds (default: 5000)

#### removeToast(id)

- `id`: `string` - The toast ID to remove

#### clearAllToasts()

Removes all active toasts.

### ToastContainer

Renders the toast notifications.

```tsx
<ToastContainer
  toasts={toasts}
  onRemove={removeToast}
  position="top-right"
/>
```

## Implementation Details

### Components

- **Toast**: Individual toast notification with auto-dismiss logic
- **ToastContainer**: Container managing multiple toasts
- **ToastProvider**: Context provider for toast state management

### State Management

Uses React's `useReducer` for toast state management with actions for:
- Adding toasts
- Removing toasts
- Clearing all toasts

### Styling

- Tailwind CSS classes for responsive design
- CSS custom properties for theme adaptation
- Progress bar animation using CSS transitions

### Accessibility

- `role="alert"` and `aria-live="assertive"` for screen readers
- Proper focus management
- Keyboard navigation support

## Error Handling

The system gracefully handles errors by:
- Falling back to default duration if invalid
- Logging errors to console
- Continuing to work even if individual toasts fail

## Browser Support

Works in all modern browsers that support:
- React 16.8+ (hooks)
- ES6 features
- CSS Grid/Flexbox
- CSS Transitions