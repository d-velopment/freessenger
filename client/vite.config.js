import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Оптимизация для bundle
		minify: 'esbuild',
		sourcemap: false,
		rollupOptions: {
			output: {
				// Принудительно создаем один чанк
				manualChunks: () => 'app',
				// Включаем динамические импорты в bundle
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
	}
});
