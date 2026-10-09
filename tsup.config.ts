import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { contextify: 'src/contextify.ts' },
    format: ['esm', 'cjs'],
    target: 'es2020',
    dts: true,
  },
  {
    entry: { contextify: 'src/contextify.ts' },
    format: ['iife'],
    target: 'es2020',
    globalName: 'Contextify',
    minify: true,
    footer: { js: 'Contextify = Contextify.default;' },
  },
]);
