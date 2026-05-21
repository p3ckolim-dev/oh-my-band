import { defineConfig } from 'vite';

export default defineConfig({
  base: '/letspiano/', // Required for GitHub Pages deployment under https://<username>.github.io/letspiano/
  build: {
    outDir: 'dist',
  }
});
