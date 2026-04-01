import { defineConfig } from 'tsdown';

export default defineConfig({
  exports: { legacy: true },
  entry: {
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'esnext',
});
