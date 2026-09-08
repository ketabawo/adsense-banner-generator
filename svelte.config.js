import node from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Legacy static export intentionally omits non-prerendered server API routes.
    adapter: process.env.BUILD_TARGET === 'static'
      ? adapterStatic({ pages: 'build-static', assets: 'build-static', strict: false })
      : node({ out: 'build' })
  }
};
export default config;
