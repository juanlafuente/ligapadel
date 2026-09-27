import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages sirve la web en https://<usuario>.github.io/ligapadel/
export default defineConfig({
  base: '/ligapadel/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
