#!/usr/bin/env node

/**
 * HTTPS Development Server for PWA Testing
 *
 * This script starts a HTTPS development server that allows PWA installation
 * over local networks. Required for testing PWA installation on mobile devices.
 *
 * Usage:
 *   node scripts/dev-https.js
 *   # or
 *   npm run dev:https
 */

import { createServer } from 'https';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

#!/usr/bin/env node

/**
 * HTTPS Development Server for PWA Testing
 *
 * This script starts a HTTPS development server that allows PWA installation
 * over local networks. Required for testing PWA installation on mobile devices.
 *
 * Usage:
 *   node scripts/dev-https.js
 *   # or
 *   npm run dev:https
 */

import { createServer } from 'https';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Check if OpenSSL is available
function checkOpenSSL() {
  try {
    execSync('openssl version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Generate self-signed certificate for development
function generateCertificate() {
  const keyPath = join(projectRoot, 'dev-cert.key');
  const certPath = join(projectRoot, 'dev-cert.pem');

  // Check if certificates already exist
  if (existsSync(keyPath) && existsSync(certPath)) {
    console.log('✅ Using existing development certificates');
    return { keyPath, certPath };
  }

  if (!checkOpenSSL()) {
    console.error('❌ OpenSSL is not installed or not in PATH');
    console.error('');
    console.error('📦 Install OpenSSL:');
    console.error('   Windows: https://slproweb.com/products/Win32OpenSSL.html');
    console.error('   macOS:   brew install openssl');
    console.error('   Linux:   apt install openssl (or yum install openssl)');
    console.error('');
    console.error('🛠️  Manual certificate generation:');
    console.error('   openssl genrsa -out dev-cert.key 2048');
    console.error('   openssl req -new -x509 -key dev-cert.key -out dev-cert.pem -days 365 -subj "/CN=localhost"');
    console.error('');
    process.exit(1);
  }

  console.log('🔐 Generating development SSL certificates...');

  try {
    // Generate private key
    execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'pipe' });

    // Generate certificate
    execSync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=US/ST=Dev/L=Dev/O=Dev/CN=localhost"`, { stdio: 'pipe' });

    console.log('✅ Development certificates generated');
    console.log('⚠️  These certificates are for development only!');
    console.log('⚠️  Your browser will show security warnings - this is normal for self-signed certificates');

    return { keyPath, certPath };
  } catch (error) {
    console.error('❌ Failed to generate certificates:', error.message);
    process.exit(1);
  }
}

function startDevServer() {
  const { keyPath, certPath } = generateCertificate();

  const options = {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath)
  };

  // Import Vite's dev server
  import('vite').then(async ({ createServer: createViteServer }) => {
    const vite = await createViteServer({
      server: {
        https: options,
        host: true, // Listen on all interfaces for local network access
        open: false
      },
      define: {
        'import.meta.env.VITE_DEV_MODE': JSON.stringify('true')
      }
    });

    await vite.listen();

    const info = vite.config.server;
    const protocol = 'https';
    const port = info.port || 5173;

    console.log('\n🚀 HTTPS Development Server Started!');
    console.log('=====================================');
    console.log(`📱 Local:     ${protocol}://localhost:${port}`);
    console.log(`🌐 Network:   ${protocol}://<your-ip>:${port}`);
    console.log(`📱 PWA Mode:  Development (Red theme)`);
    console.log('');
    console.log('📋 Mobile Testing Instructions:');
    console.log('1. Find your computer\'s IP address:');
    console.log('   - Windows: ipconfig');
    console.log('   - macOS/Linux: ifconfig or ip addr');
    console.log('2. On your mobile device, visit: https://<your-ip>:' + port);
    console.log('3. Accept the security warning (self-signed certificate)');
    console.log('4. The app should now be installable as PWA!');
    console.log('');
    console.log('⚠️  Security Warning:');
    console.log('   This uses self-signed certificates for development.');
    console.log('   Accept the browser warning to continue.');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
  }).catch(error => {
    console.error('❌ Failed to start Vite dev server:', error);
    process.exit(1);
  });
}

startDevServer();