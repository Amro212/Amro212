import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/');

          if (!normalizedId.includes('/node_modules/')) {
            return undefined;
          }

          if (normalizedId.includes('/three/examples/')) {
            return 'three-extras';
          }

          if (normalizedId.includes('/three/')) {
            return 'three-core';
          }

          if (normalizedId.includes('/gsap/') || normalizedId.includes('/lenis/')) {
            return 'motion';
          }

          if (normalizedId.includes('/gifuct-js/')) {
            return 'gifuct';
          }

          return undefined;
        },
      },
    },
  },
});
