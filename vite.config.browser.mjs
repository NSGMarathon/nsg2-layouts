import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import NodeCGPlugin from '@inkfarer/vite-plugin-nodecg';
import checker from 'vite-plugin-checker';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        checker({
            vueTsc: {
                tsconfigPath: 'tsconfig.browser.json'
            }
        }),
        vue(),
        NodeCGPlugin()
    ],
    resolve: {
        alias: {
            types: resolve(import.meta.dirname, 'src/types'),
            'client-shared': resolve(import.meta.dirname, 'src/client-shared'),
            'shared': resolve(import.meta.dirname, 'src/shared'),
            components: resolve(import.meta.dirname, 'src/graphics/components')
        }
    }
});
