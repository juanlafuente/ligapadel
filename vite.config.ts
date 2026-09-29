import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages sirve la web en https://<usuario>.github.io/laligamatilda/
export default defineConfig({
  base: '/laligamatilda/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
