import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('../../../',import.meta.url)),build:{outDir:fileURLToPath(new URL('../evidence/isolated-q2-dist/',import.meta.url)),emptyOutDir:false,minify:false,rollupOptions:{input:fileURLToPath(new URL('./build-entry.html',import.meta.url))}}});
