export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.DuwFHJhb.js",app:"_app/immutable/entry/app.6eK1Qr5G.js",imports:["_app/immutable/entry/start.DuwFHJhb.js","_app/immutable/chunks/CVs6drcE.js","_app/immutable/chunks/7u6au6bF.js","_app/immutable/entry/app.6eK1Qr5G.js","_app/immutable/chunks/7u6au6bF.js","_app/immutable/chunks/D6jbXSnz.js","_app/immutable/chunks/D39ZREKu.js","_app/immutable/chunks/GBDdTnow.js","_app/immutable/chunks/PTdMS6Db.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/chat/[roomHash]",
				pattern: /^\/chat\/([^/]+?)\/?$/,
				params: [{"name":"roomHash","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
