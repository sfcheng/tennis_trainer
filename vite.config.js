import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

export default defineConfig({
  base: './',
  publicDir: false,
  // Preserve the notebook when rebuilding the locally served Apache folder.
  build: { emptyOutDir: false },
  plugins: [{
    name: 'php-backend',
    generateBundle() {
      for (const name of ['api.php', '.htaccess']) {
        this.emitFile({ type: 'asset', fileName: name, source: readFileSync(new URL(`./public/${name}`, import.meta.url)) });
      }
    },
  }],
  server: { proxy: { '/api.php': 'http://127.0.0.1:8081' } },
});
