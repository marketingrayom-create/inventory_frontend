import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        https: {
            key: readFileSync(new URL('./.lan-cert/inventory-lan-key.pem', import.meta.url)),
            cert: readFileSync(new URL('./.lan-cert/inventory-lan-cert.pem', import.meta.url)),
        },
        port: 5173,
        strictPort: true,
        proxy: {
            '/uploads': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
            },
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
            },
        },
    },
});
