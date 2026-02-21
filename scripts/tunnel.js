#!/usr/bin/env node
import localtunnel from 'localtunnel';

const PORT = 11434; // fixed port for Ollama
const SUBDOMAIN = process.env.SUBDOMAIN || 'samvada-ollama';

async function run() {
  try {
    console.log(`Starting localtunnel for localhost:${PORT} (subdomain=${SUBDOMAIN})`);
    const tunnel = await localtunnel({ port: PORT, subdomain: SUBDOMAIN });

    console.log('Tunnel established:');
    console.log(`  Public URL: ${tunnel.url}`);
    console.log('Use this host in Admin -> Ollama -> + Add Host (protocol=https, port=443)');
    console.log('Press Ctrl+C to stop the tunnel.');

    tunnel.on('close', () => {
      console.log('Tunnel closed');
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\nStopping tunnel...');
      await tunnel.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('Failed to create tunnel:', err.message || err);
    process.exit(1);
  }
}

run();
