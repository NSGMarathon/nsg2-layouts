import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import NodeCGPlugin from 'vite-plugin-nodecg';
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
            types: resolve(__dirname, 'src/types'),
            'client-shared': resolve(__dirname, 'src/client-shared'),
            'shared': resolve(__dirname, 'src/shared'),
            components: resolve(__dirname, 'src/graphics/components')
        }
    }
});
