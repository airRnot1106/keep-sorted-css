import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index'],
  format: 'esm',
  clean: true,
  sourcemap: false,
  minify: true,
  dts: true,
  treeshake: true,
  publint: true,
  unused: true,
  exports: true,
});
