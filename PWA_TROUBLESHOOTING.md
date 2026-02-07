# PWA Installation Troubleshooting

## Can't Install PWA on Mobile Device?

Progressive Web Apps (PWAs) require HTTPS to be installed. Local development servers typically use HTTP, which prevents PWA installation on mobile devices.

## Quick Fix: Use HTTPS Development Server

### Option 1: Automated HTTPS Setup (Recommended)

1. **Install OpenSSL** (if not already installed):
   - **Windows**: Download from https://slproweb.com/products/Win32OpenSSL.html
   - **macOS**: `brew install openssl`
   - **Linux**: `apt install openssl` or `yum install openssl`

2. **Start HTTPS Development Server**:
   ```bash
   npm run dev:https
   ```

### Option 2: Manual HTTPS Setup

1. **Generate SSL Certificates**:
   ```bash
   # Generate private key
   openssl genrsa -out dev-cert.key 2048

   # Generate certificate
   openssl req -new -x509 -key dev-cert.key -out dev-cert.pem -days 365 -subj "/CN=localhost"
   ```

2. **Start Vite with HTTPS**:
   ```bash
   VITE_DEV_MODE=true vite --host --https --https-key dev-cert.key --https-cert dev-cert.pem
   ```

### Option 3: Use ngrok (Easiest)

1. **Install ngrok**: https://ngrok.com/download
2. **Start normal dev server**: `npm run dev`
3. **Expose via ngrok**: `ngrok http 5173`
4. **Use the HTTPS URL** provided by ngrok

## Find Your Computer's IP Address

- **Windows**: Open Command Prompt → `ipconfig` → Look for "IPv4 Address"
- **macOS/Linux**: Open Terminal → `ifconfig` or `ip addr` → Look for "inet" address

## Access from Mobile Device

1. Open browser on mobile device
2. Visit: `https://<your-ip-address>:5173`
3. **Accept the security warning** (self-signed certificate for development)
4. The app should now be installable as PWA!

## What You'll See

- **Development Mode**: Red-themed PWA icon ("Samvada Studio (Dev)")
- **Production Mode**: Blue-themed PWA icon ("Samvada Studio")
- Both can be installed simultaneously without conflicts

## Troubleshooting

### Still Can't Install?

1. **Check PWA Errors**: Go to Admin Panel → PWA Status tab
2. **Clear Browser Data**: Clear site data and service workers
3. **Try Different Browser**: Chrome/Edge work best for PWAs
4. **Check Network**: Ensure mobile device can access your computer's IP

### Error Messages

- **"HTTPS Required"**: Use the HTTPS dev server above
- **"Service Worker Not Supported"**: Update your browser
- **"Manifest Not Found"**: Check if `/manifest.webmanifest` loads

### Browser Support

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop - limited PWA support)
- ✅ Safari (iOS - limited PWA support)
- ❌ Internet Explorer (not supported)

## Alternative: Use Production Build

If HTTPS setup is too complex, you can:

1. Build the app: `npm run build`
2. Serve locally: `npm run preview`
3. Use ngrok: `ngrok http 4173` (production preview port)
4. Access via ngrok's HTTPS URL

This simulates production deployment for testing PWA installation.