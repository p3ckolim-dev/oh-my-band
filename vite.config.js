import { defineConfig } from 'vite';

export default defineConfig({
  base: '/oh-my-band/', // Required for GitHub Pages deployment under https://<username>.github.io/oh-my-band/
  build: {
    outDir: 'dist',
  }
});
