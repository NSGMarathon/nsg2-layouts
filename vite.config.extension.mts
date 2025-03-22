import { defineConfig } from 'vite';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import checker from 'vite-plugin-checker';

export default defineConfig({
    esbuild: {
        keepNames: true
    },
    build: {
        outDir: 'extension',
        lib: {
            entry: resolve(__dirname, 'src/extension/index.ts'),
            name: 'extension',
            fileName: 'index',
            formats: ['cjs']
        },
        rollupOptions: {
            external: [
                'axios',
                /lodash\/.*/,
                'uuid',
                'livesplit-core',
                'obs-websocket-js',
                'ws',
                'url',
                'osc',
                /fs\/.*/,
                /node:.*/
            ]
        }
    },
    plugins: [
        checker({
            typescript: {
                tsconfigPath: 'tsconfig.extension.json'
            }
        }),
        tsconfigPaths({
            projects: ['tsconfig.extension.json']
        })
    ]
});
