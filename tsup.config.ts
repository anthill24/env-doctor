import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
  },
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  dts: true,
  sourcemap: false,
  splitting: false,
  // Bundle runtime deps so the published CLI and the GitHub Action entrypoint
  // are self-contained once built.
  noExternal: ['tinyglobby'],
});
