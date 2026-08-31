import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Admin instance used by the dev server. Override with IOB_ADMIN when the
// ioBroker host is not on localhost (e.g. IOB_ADMIN=http://172.23.215.95:8081).
const ADMIN = process.env.IOB_ADMIN || 'http://localhost:8081';

export default defineConfig(() => ({
    plugins: [react()],
    // relative asset URLs, so the bundle works under /adapter/gree-hvac/
    base: './',
    build: {
        outDir: 'build',
        emptyOutDir: true,
        // admin/ is committed to git - source maps would double the repo churn
        // and are not matched by the "files" globs of the npm package anyway
        sourcemap: false,
        // the material symbols woff2 is 250 kB, never inline assets
        assetsInlineLimit: 0,
        chunkSizeWarningLimit: 1500,
    },
    server: {
        port: 3000,
        host: true,
        proxy: {
            '/adapter': { target: ADMIN, changeOrigin: true, secure: false },
        },
    },
}));
