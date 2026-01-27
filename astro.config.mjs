// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';


export default defineConfig({
	// @ts-ignore
  output: 'server',
  adapter: vercel(),
});
