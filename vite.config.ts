import { defineConfig } from 'vite';
import { pbkdf2Sync, randomBytes } from 'node:crypto';

// Nazorat kodi hech qachon ilovaga ochiq yozilmaydi: faqat PBKDF2 izi (hash) kiradi.
const ITER = 310000;
function adminHash() {
  const code = process.env.ADMIN_INITIAL_CODE;
  if (!code) return null;
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(code, Buffer.from(salt, 'hex'), ITER, 32, 'sha256').toString('hex');
  return { salt, hash, iter: ITER };
}

export default defineConfig({
  base: './',
  define: {
    __ADMIN__: JSON.stringify(adminHash()),
    __TEST_BUILD__: JSON.stringify(process.env.TEST_BUILD !== '0'),
  },
  build: { target: 'es2020', outDir: 'dist', chunkSizeWarningLimit: 2000 },
});
