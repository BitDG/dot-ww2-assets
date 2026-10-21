import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('../../../',import.meta.url)),build:{outDir:fileURLToPath(new URL('../evidence-f2/isolated-dist/',import.meta.url)),emptyOutDir:false,minify:false,rollupOptions:{input:fileURLToPath(new URL('./build-entry-f2.html',import.meta.url))}}});
