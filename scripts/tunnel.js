#!/usr/bin/env node
import localtunnel from 'localtunnel';

const PORT = 11434; // fixed port for Ollama
const ENV_SUBDOMAIN = process.env.SUBDOMAIN;

async function run() {
  try {
    console.log(`Starting localtunnel for localhost:${PORT} ${ENV_SUBDOMAIN ? `(subdomain=${ENV_SUBDOMAIN})` : '(no subdomain - random URL)'}`);
    const options = { port: PORT };
    if (ENV_SUBDOMAIN) options.subdomain = ENV_SUBDOMAIN;
    const tunnel = await localtunnel(options);

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
    // Log full error for easier debugging (stack if available)
    console.error('Failed to create tunnel:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

run();
