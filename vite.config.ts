import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
    define: {
        global: 'globalThis',
    },
    plugins: [
        vue(),
    ],
    publicDir: false,
    resolve: {
        alias: {
            vue: 'vue/dist/vue.esm-bundler.js',
        },
    },
    build: {
        manifest: true,
        outDir: 'public/dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                app: resolve(__dirname, 'client/lighterpack.ts'),
            },
        },
    },
});
