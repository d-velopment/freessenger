import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'dist',
			assets: 'dist',
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		prerender: {
			handleMissingId: 'warn'
		}
	},
	compilerOptions: {
		warningFilter: (warning) => {
			return !warning.code.startsWith('a11y');
		}
	}
};

export default config;
