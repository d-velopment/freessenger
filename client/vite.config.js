import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5173,
		proxy: {
			'/ws': {
				target: 'ws://localhost:8080',
				ws: true
			}
		}
	}
});
