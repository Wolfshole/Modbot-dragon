// @ts-check
import { defineConfig } from 'astro/config';
// @ts-ignore
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  // ...existing config...
});
