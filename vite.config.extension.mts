import { defineConfig } from 'vite';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import checker from 'vite-plugin-checker';

export default defineConfig({
    build: {
        outDir: 'extension',
        lib: {
            entry: resolve(import.meta.dirname, 'src/extension/index.ts'),
            name: 'extension',
            fileName: 'index',
            formats: ['cjs']
        },
        rolldownOptions: {
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
            ],
            output: {
                keepNames: true
            }
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
