import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps the build portable: the dist folder can be served from any
// static host or sub-path. Routing uses a hash router for the same reason.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as Parameters<typeof defineConfig>[0]);
