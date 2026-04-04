import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Убираем обфускацию для дебага
		minify: false,
		sourcemap: true,
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
	},
	// Игнорировать a11y ошибки для VS Code
	define: {
		__SVELTEKIT_DEV__: true
	}
});
