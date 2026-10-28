import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Built output is deployed at https://punicodex.com/herald/restoration/
export default defineConfig({
  base: '/herald/restoration/',
  build: {
    target: 'es2022',
    outDir: fileURLToPath(new URL('../../herald/restoration', import.meta.url)),
    emptyOutDir: true,
  },
});
