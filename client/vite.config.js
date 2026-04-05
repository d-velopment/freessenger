import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		minify: true,
		sourcemap: false,
		rollupOptions: {
			output: {
				manualChunks: () => 'app',
				inlineDynamicImports: true
			}
		}
	},
	server: {
		port: 5173,
		proxy: {
			'/ws': {
				target: 'ws://localhost:8080',
				ws: true
			}
		}
	},
	define: {
		__SVELTEKIT_DEV__: true
	}
});
