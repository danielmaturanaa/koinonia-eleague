import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const api = spawn(process.execPath, [fileURLToPath(new URL('../api-proxy.mjs', import.meta.url))], {
  stdio: 'inherit',
  env: process.env,
});

const viteCommand = process.platform === 'win32' ? 'vite.cmd' : 'vite';
const vite = spawn(viteCommand, [
  '--configLoader', 'native',
  '--host', '127.0.0.1',
  '--port', '5174',
  '--strictPort',
], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

let shuttingDown = false;

function stop() {
  if (shuttingDown) return;
  shuttingDown = true;
  api.kill('SIGTERM');
  vite.kill('SIGTERM');
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

api.on('error', (error) => {
  console.error('Could not start API proxy:', error.message);
  stop();
});

vite.on('error', (error) => {
  console.error('Could not start Vite:', error.message);
  stop();
});

api.on('exit', (code, signal) => {
  if (!shuttingDown && code !== 0) {
    console.error(`API proxy exited with ${signal ? `signal ${signal}` : `code ${code}`}.`);
    stop();
  }
});

vite.on('exit', (code, signal) => {
  if (!shuttingDown && code !== 0) {
    console.error(`Vite exited with ${signal ? `signal ${signal}` : `code ${code}`}.`);
    stop();
  }
});
